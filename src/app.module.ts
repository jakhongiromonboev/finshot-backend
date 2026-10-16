import { Module } from "@nestjs/common";
import { ComponentsModule } from "./components/components.module.js";

@Module({
  imports: [ComponentsModule],
})
export class AppModule {}
