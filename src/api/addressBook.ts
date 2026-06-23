import { apiFetch } from "./client";

export type AddressBookContact = {
  id: number;

  first_name?: string | null;
  last_name?: string | null;

  website?: string | null;
  email: string;
  note?: string | null;

  created_at: string;
  updated_at: string;
};

export type AddressBookContactInput = {
  first_name?: string | null;
  last_name?: string | null;

  website?: string | null;
  email: string;
  note?: string | null;
};

export type AddressBookContactsResponse = {
  items: AddressBookContact[];
  total: number;
};

function buildQuery(params: {
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();

  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  if (typeof params.limit === "number") {
    search.set("limit", String(params.limit));
  }

  if (typeof params.offset === "number") {
    search.set("offset", String(params.offset));
  }

  const query = search.toString();

  return query ? `?${query}` : "";
}

export async function listAddressBookContacts(
  params: {
    q?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<AddressBookContactsResponse> {
  const query = buildQuery({
    q: params.q,
    limit: params.limit ?? 200,
    offset: params.offset ?? 0,
  });

  return apiFetch<AddressBookContactsResponse>(
    `/address-book${query}`,
    {
      method: "GET",
    }
  );
}

/**
 * Загружает всю адресную книгу.
 * Backend отдаёт максимум 200 записей за запрос,
 * поэтому страницы объединяются на клиенте.
 */
export async function listAllAddressBookContacts(): Promise<
  AddressBookContact[]
> {
  const pageSize = 200;

  let offset = 0;
  let total = 0;

  const all: AddressBookContact[] = [];

  do {
    const response = await listAddressBookContacts({
      limit: pageSize,
      offset,
    });

    const page = Array.isArray(response.items)
      ? response.items
      : [];

    all.push(...page);

    total = Number(response.total || 0);
    offset += page.length;

    if (page.length === 0) {
      break;
    }
  } while (offset < total);

  return all;
}

export async function createAddressBookContact(
  payload: AddressBookContactInput
): Promise<AddressBookContact> {
  return apiFetch<AddressBookContact>(
    "/address-book",
    {
      method: "POST",
      json: payload,
    }
  );
}

export async function updateAddressBookContact(
  contactId: number,
  payload: Partial<AddressBookContactInput>
): Promise<AddressBookContact> {
  return apiFetch<AddressBookContact>(
    `/address-book/${contactId}`,
    {
      method: "PATCH",
      json: payload,
    }
  );
}

export async function deleteAddressBookContact(
  contactId: number
): Promise<{
  ok: boolean;
  contact_id: number;
}> {
  return apiFetch<{
    ok: boolean;
    contact_id: number;
  }>(`/address-book/${contactId}`, {
    method: "DELETE",
  });
}