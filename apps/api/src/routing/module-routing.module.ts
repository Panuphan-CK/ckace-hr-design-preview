import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { ModuleRoutingGuard } from "./module-routing.guard";
import { ModuleRoutingService } from "./module-routing.service";

@Module({
  providers: [
    ModuleRoutingService,
    ModuleRoutingGuard,
    {
      provide: APP_GUARD,
      useExisting: ModuleRoutingGuard,
    },
  ],
  exports: [ModuleRoutingService],
})
export class ModuleRoutingModule {}
