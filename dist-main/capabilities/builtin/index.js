"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBuiltinCapabilities = registerBuiltinCapabilities;
const kvCapability_1 = require("./kvCapability");
const memoCapability_1 = require("./memoCapability");
const sandboxCapability_1 = require("./sandboxCapability");
const imageCapability_1 = require("./imageCapability");
const storyboardCapability_1 = require("./storyboardCapability");
function registerBuiltinCapabilities(registry) {
    // Use factories to avoid instantiating everything eagerly.
    registry.registerFactory('memo', () => (0, memoCapability_1.createMemoCapability)());
    registry.registerFactory('kv', () => (0, kvCapability_1.createKvCapability)());
    registry.registerFactory('sandbox', () => (0, sandboxCapability_1.createSandboxCapability)());
    registry.registerFactory('image', () => (0, imageCapability_1.createImageCapability)());
    registry.registerFactory('storyboard', () => (0, storyboardCapability_1.createStoryboardCapability)());
}
