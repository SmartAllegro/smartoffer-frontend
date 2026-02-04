import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getApiMode, setApiMode, isRealApiConfigured, type ApiMode } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';

export function ApiModeToggle() {
  const [mode, setMode] = useState<ApiMode>(getApiMode());
  const realApiAvailable = isRealApiConfigured();

  useEffect(() => {
    setApiMode(mode);
  }, [mode]);

  const handleToggle = (checked: boolean) => {
    setMode(checked ? 'real' : 'mock');
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <Switch
          id="api-mode"
          checked={mode === 'real'}
          onCheckedChange={handleToggle}
          disabled={!realApiAvailable && mode === 'mock'}
        />
        <Label htmlFor="api-mode" className="text-sm font-medium cursor-pointer">
          Real API
        </Label>
      </div>
      
      <Badge variant={mode === 'real' ? 'default' : 'secondary'} className="text-xs">
        {mode === 'real' ? 'PRODUCTION' : 'MOCK'}
      </Badge>

      {!realApiAvailable && (
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          <span>API key не настроен</span>
        </div>
      )}
    </div>
  );
}
