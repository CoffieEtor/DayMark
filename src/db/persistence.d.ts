export type EntityKind = "tasks" | "reminders" | "wishlist" | "notifications";

export type RawSnapshot = {
  tasks: any[];
  reminders: any[];
  wishlist: any[];
  notifications: any[];
  settings: Record<string, string>;
};

export declare function initStorage(): Promise<RawSnapshot>;
export declare function saveSetting(key: string, value: string): void;
export declare function saveEntity(kind: EntityKind, row: any): void;
export declare function deleteEntity(kind: EntityKind, id: string): void;
export declare function clearAllEntities(): void;
export declare function clearNotificationEntities(): void;
