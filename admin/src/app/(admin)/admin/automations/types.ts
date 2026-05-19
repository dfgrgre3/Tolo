export interface Rule {
  id: string;
  name: string;
  triggerType: string;
  conditions: Record<string, unknown>;
  actionType: string;
  actionData: Record<string, unknown>;
  isActive: boolean;
  isNew?: boolean;
}
