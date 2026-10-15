import { Module } from "@nestjs/common";

import { Task34R2Controller } from "./task34-r2.controller";

@Module({
  controllers: [Task34R2Controller],
})
export class Task34R2Module {}
