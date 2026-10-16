import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { DatabaseSync, StatementSync } from "node:sqlite";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection: DatabaseSync | undefined;

  onModuleInit(): void {
    const schemaPath = new URL("../../../schema.sql", import.meta.url);
    const schema = readFileSync(schemaPath, "utf8");
    const databasePath = process.env.DATABASE_PATH ?? ":memory:";

    const connection = new DatabaseSync(databasePath, {
      enableForeignKeyConstraints: true,
    });

    try {
      connection.exec(schema);
      console.log(
        `SQLite connected to ${
          process.env.NODE_ENV === "production" ? "production" : "development"
        } db`,
      );
    } catch (error) {
      connection.close();
      console.log("ERROR: Not connected to SQLite");
      throw error;
    }

    this.connection = connection;
  }

  prepare(sql: string): StatementSync {
    if (!this.connection) {
      throw new Error("Database is not initialized");
    }

    return this.connection.prepare(sql);
  }

  onModuleDestroy(): void {
    this.connection?.close();
    this.connection = undefined;
  }
}
