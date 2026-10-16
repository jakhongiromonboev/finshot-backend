import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { DatabaseSync, StatementSync } from "node:sqlite";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly connection: DatabaseSync;

  constructor() {
    const schemaPath = new URL("../../../schema.sql", import.meta.url);
    const schema = readFileSync(schemaPath, "utf8");

    this.connection = new DatabaseSync(":memory:", {
      enableForeignKeyConstraints: true,
    });

    try {
      this.connection.exec(schema);
    } catch (error) {
      this.connection.close();
      throw error;
    }
  }

  prepare(sql: string): StatementSync {
    return this.connection.prepare(sql);
  }

  onModuleDestroy(): void {
    this.connection.close();
  }
}
