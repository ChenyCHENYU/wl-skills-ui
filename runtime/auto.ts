import { installUiRuntimeProfile } from "./profiles";

// Backward-compatible full legacy entry. New integrations should import an
// explicit runtime/profiles/* entry so AG Grid observers stay optional.
installUiRuntimeProfile("legacy-jh-ag");
