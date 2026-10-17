import type { ModuleManifest } from "@/core/modules/types";
import { pushModule } from "./push/manifest";
import { reviewsModule } from "./reviews/manifest";
import { servicesModule } from "./services/manifest";

/** The only place that lists modules. Core reads them through src/core/modules/registry.ts. */
export const MODULES: readonly ModuleManifest[] = [servicesModule, pushModule, reviewsModule];
