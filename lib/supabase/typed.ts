import type { Database, Json } from "@/lib/supabase/database.types";

type PublicTables = Database["public"]["Tables"];

export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];

type DynamicRow = { [column: string]: Json | undefined };

/** Schema with no per-table column types, for the one write whose table name
 * is only known at runtime (restoreVersion writes a content_versions snapshot
 * back to its source table). The table name must still be checked against an
 * allow-list before use; Postgres validates the column types. */
export type DynamicTablesDatabase = {
  public: {
    Tables: {
      [table: string]: { Row: DynamicRow; Insert: DynamicRow; Update: DynamicRow; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
