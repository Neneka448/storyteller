# Template System Research & Proposal

## 1. Research Summary: World Anvil & Campfire Writing

### World Anvil
**Philosophy**: Comprehensive, prompt-driven, structured wiki.
*   **Structure**: Uses fixed "Article Templates" (Character, Location, Organization, etc.).
*   **Fields**:
    *   **Vignette (Sidebar)**: Structured data for quick reference (e.g., Race, Age, Gender, Current Status).
    *   **Main Content**: Divided into tabs and sections (e.g., "Appearance", "Mentality", "History").
    *   **Prompts**: Each field has detailed prompts to inspire the writer (e.g., "Describe the character's clothing style and how it reflects their status").
*   **Data Types**: Text, Rich Text, Dropdowns, Date/Time, Entity Links (Mentions), Images.
*   **Layout**: Fixed layout with a prominent sidebar and tabbed main content area.

### Campfire Writing
**Philosophy**: Modular, flexible, component-based.
*   **Structure**: Uses "Elements" composed of "Panels".
*   **Fields**:
    *   **Attributes Panel**: Custom Key-Value pairs (Text, Number, Checkbox).
    *   **Text Panels**: Rich text blocks that can be renamed (e.g., "Backstory", "Personality").
    *   **Relations Panel**: Graph-based links to other elements.
*   **Layout**: Grid-based, drag-and-drop interface. Users can design their own templates by arranging panels.
*   **Abstraction**: A "Character" is just a configuration of panels (Bio + Stats + Image + Notes).

### Common Patterns
1.  **Separation of Structured vs. Unstructured Data**:
    *   **Structured (KV)**: Stats, dates, physical traits, classifications. (Sidebar/Attributes)
    *   **Unstructured (Memo)**: Biography, history, descriptions. (Main Content)
2.  **Entity Linking**: Both systems heavily emphasize linking entities (e.g., "Born in [Location]").
3.  **Grouping**: Fields are rarely a flat list; they are grouped by semantic category (Physical, Mental, Social).

---

## 2. Proposal: Template Schema Abstraction

To support similar functionality in Storyteller, we need a schema that maps high-level "user-facing sections" (Campfire-style Panels) and "fields" to our underlying low-level "Capabilities" (`kv`, `memo`, `image`, etc.).

**Important decision (MVP 방향)**

- We will **not** build a full low-code form designer (pixel/grid-level input placement).
- We will adopt a **lightweight Section/Panel assembly** model:
  - A page is composed of a small set of Section types (ChildrenList / KvGroup / MemoBlock / ImageBlock ...).
  - KvGroup fields are **template-driven** (not free-form KV table as the default user experience).
  - Users can add/remove/reorder Sections and fields in UI later (instance overrides), with an optional “promote to template” flow.

See: [05-template-assembly-system.md](./05-template-assembly-system.md) for the execution model.

### Core Concepts
*   **Template**: Defines a `NodeType` or pattern (e.g., "char.card.*").
*   **Section**: A user-facing block (e.g., "Quick Facts" KvGroup, "Backstory" MemoBlock).
*   **Field**: A single input unit within a KvGroup (e.g., "Age", "Role").
*   **Binding**: How a Section/Field maps to a Capability's data.
*   **Layout**: Primarily Section order + light hints (sidebar/main), not pixel-level placement.

### Schema Interfaces

```typescript
/**
 * Defines a template for a specific Node Type (e.g., "character", "location").
 */
export interface TemplateDefinition {
  id: string;          // e.g., "character"
  label: string;       // e.g., "Character"
  description?: string;
  icon?: string;       // Icon name

  // The set of capabilities that must be active on this node
  requiredCapabilities: string[]; // ['kv', 'memo', 'image']

  // Definitions of all fields available in this template
  fields: FieldDefinition[];

  // How these fields are organized in the UI
  layout: LayoutGroup[];
}

/**
 * Defines a single data entry point.
 */
export interface FieldDefinition {
  key: string;         // Unique key within the template, e.g., "age", "bio"
  label: string;       // Display label, e.g., "Age"
  type: FieldType;     // The UI component to render
  
  // Configuration for the UI component
  uiConfig?: {
    placeholder?: string;
    helpText?: string; // Prompt/Tooltip
    options?: string[]; // For select/tags
    rows?: number;      // For textarea
  };

  // Default value if not present
  defaultValue?: any;

  // Binds this field to a specific capability's data
  binding: CapabilityBinding;
}

/**
 * Supported Field Types
 */
export type FieldType = 
  | 'text'          // Simple string input
  | 'textarea'      // Multi-line string
  | 'richtext'      // WYSIWYG editor
  | 'number'        // Numeric input
  | 'select'        // Dropdown
  | 'tags'          // Array of strings
  | 'reference'     // Link to another Node ID
  | 'image';        // Image uploader/selector

/**
 * Maps a Field to a Capability.
 */
export type CapabilityBinding = 
  | KvBinding 
  | MemoBinding 
  | ImageBinding;

/**
 * Maps to the 'kv' capability.
 * Finds or creates an item with key = `key`.
 */
export interface KvBinding {
  capabilityId: 'kv';
  key: string; // The 'k' in {k, v}
}

/**
 * Maps to the 'memo' capability.
 * Usually maps to the entire content, or a section if we support multi-part memos.
 */
export interface MemoBinding {
  capabilityId: 'memo';
  // Future: support 'section' if memo becomes structured
}

/**
 * Maps to the 'image' capability.
 */
export interface ImageBinding {
  capabilityId: 'image';
}

/**
 * UI Organization
 */
export interface LayoutGroup {
  id: string;
  label?: string;
  type: 'tab' | 'section' | 'sidebar';
  children?: LayoutGroup[]; // Nested groups
  fields?: string[];        // Field keys to display here
}
```

### Example: Character Template JSON

```json
{
  "id": "character",
  "label": "Character",
  "requiredCapabilities": ["kv", "memo", "image"],
  "fields": [
    {
      "key": "name",
      "label": "Full Name",
      "type": "text",
      "binding": { "capabilityId": "kv", "key": "Name" }
    },
    {
      "key": "age",
      "label": "Age",
      "type": "text",
      "binding": { "capabilityId": "kv", "key": "Age" }
    },
    {
      "key": "role",
      "label": "Role",
      "type": "select",
      "uiConfig": { "options": ["Protagonist", "Antagonist", "Support"] },
      "binding": { "capabilityId": "kv", "key": "Role" }
    },
    {
      "key": "appearance",
      "label": "Appearance",
      "type": "textarea",
      "uiConfig": { "helpText": "Describe physical traits, clothing, and distinctive features." },
      "binding": { "capabilityId": "kv", "key": "Appearance" }
    },
    {
      "key": "biography",
      "label": "Biography",
      "type": "richtext",
      "binding": { "capabilityId": "memo" }
    },
    {
      "key": "portrait",
      "label": "Portrait",
      "type": "image",
      "binding": { "capabilityId": "image" }
    }
  ],
  "layout": [
    {
      "id": "main_tabs",
      "type": "tab",
      "children": [
        {
          "id": "general",
          "label": "General",
          "type": "section",
          "fields": ["name", "biography"]
        },
        {
          "id": "details",
          "label": "Details",
          "type": "section",
          "fields": ["appearance"]
        }
      ]
    },
    {
      "id": "sidebar",
      "type": "sidebar",
      "label": "Quick Stats",
      "fields": ["portrait", "age", "role"]
    }
  ]
}
```

### Integration Strategy

1.  **Template Registry**: A service that loads these JSON definitions.
2.  **Node Creation**: When creating a node of type "character", the system automatically adds the `requiredCapabilities`.
3.  **Editor UI**:
    *   Instead of rendering raw capabilities, the UI checks if a Template exists for the Node Type.
    *   If yes, it renders the `Layout` defined in the template.
    *   Inputs in the layout write back to the underlying capabilities via the `Binding`.
    *   If no template exists, it falls back to the default "Capability List" view.
