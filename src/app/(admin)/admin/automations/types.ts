export interface Rule {
  id: string;
  name: string;
  triggerType: string;
  conditions: any;
  actionType: string;
  actionData: any;
  isActive: boolean;
  isNew?: boolean;
}
