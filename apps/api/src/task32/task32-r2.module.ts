import { Module } from "@nestjs/common";

import { Task32R2Controller } from "./task32-r2.controller";

@Module({
  controllers: [Task32R2Controller],
})
export class Task32R2Module {}
