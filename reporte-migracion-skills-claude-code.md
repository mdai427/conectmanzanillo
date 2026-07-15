# Reporte de migración de Skills: Claude Code → Codex

Fecha: 2026-07-14
Árbol auditado: `~/.agents/skills`

## Resultado ejecutivo

- 98 directorios raíz inspeccionados; 93 contienen `SKILL.md`.
- 93/93 frontmatter válidos con `name` y `description`; 0 nombres inválidos y 0 duplicados.
- 93/93 pruebas estáticas de activación aprobadas.
- 18 Skills corregidas; 68 compatibles sin cambios y sin faltantes bloqueantes conocidos.
- 14 Skills requieren credenciales o una conexión autenticada para su funcionalidad externa.
- 10 Skills/paquetes requieren recuperación de archivos o decisión manual; algunas también recibieron correcciones seguras de metadatos.
- No existían menciones a `CLAUDE.md`; por tanto no hubo reemplazos `CLAUDE.md` → `AGENTS.md`.
- No se eliminó ninguna instrucción funcional. Los fallbacks Claude/Copilot válidos se conservaron cuando aportan compatibilidad adicional.

## Skills compatibles sin cambios

`10-andruia-skill-smith`, `agent-introspection-debugging`, `ask-questions-if-underspecified`, `azure-ai-formrecognizer-java`, `azure-keyvault-keys-ts`, `azure-monitor-opentelemetry-exporter-py`, `azure-monitor-opentelemetry-ts`, `azure-storage-blob-ts`, `brand-discovery`, `bug-hunter`, `cal-com-automation`, `cc-skill-coding-standards`, `cc-skill-project-guidelines-example`, `cloud-devops`, `commit`, `compose-multiplatform-patterns`, `customer-billing-ops`, `customer-support`, `database-optimizer`, `django-patterns`, `django-security`, `energy-procurement`, `error-debugging-error-analysis`, `expo-dev-client`, `freshservice-automation`, `frontend-design-direction`, `frontend-dev-guidelines`, `ghengis-learning-paths`, `golang-patterns`, `hig-components-layout`, `hig-platforms`, `hugging-face-tool-builder`, `indexing-issue-auditor`, `javascript-typescript-typescript-scaffold`, `kaizen`, `kotlin-coroutines-expert`, `kotlin-exposed-patterns`, `langfuse`, `mailchimp-automation`, `makepad-reference`, `marketing-psychology`, `metasploit-framework`, `micro-saas-launcher`, `mobile-design`, `network-engineer`, `network-interface-health`, `not-human-search-mcp`, `observability-engineer`, `pentest-checklist`, `production-code-audit`, `react-component-performance`, `recursive-decision-ledger`, `remotion-docs-demo`, `remotion-fix-dependabot`, `remotion-web-renderer-test`, `rootnode-block-selection`, `rootnode-domain-business-strategy`, `rootnode-domain-research-analysis`, `rootnode-handoff-trigger-check`, `saas-mvp-launcher`, `seo-content-auditor`, `seo-fundamentals`, `steve-jobs`, `supabase-automation`, `threejs-skills`, `track-management`, `using-git-worktrees`, `xss-html-injection`.

## Skills corregidas

- `antigravity-design-expert`: Normalizado delimitador YAML estricto.
- `apify-actor-development`: Ejemplos generatedBy actualizados a Codex/GPT-5.
- `audio-transcriber`: Codex CLI añadido como motor preferido; fallbacks Claude/Copilot conservados.
- `canary-watch`: Ruta $CODEX_HOME corregida y PostToolUse documentado como hook/CI manual.
- `dwarf-expert`: WebSearch/allowed-tools traducidos a capacidades Codex.
- `ghengis-agent-teams`: allowed-tools y nota específica de Opus convertidos a colaboración Codex.
- `ghengis-writing-skills`: allowed-tools convertido a lectura/búsqueda/shell/apply_patch de Codex.
- `jarvis-os-timer`: Frontmatter name/description añadido; runtime faltante conservado como bloqueo.
- `jarvis-os-web`: Frontmatter name/description añadido; runtime faltante conservado como bloqueo.
- `knowledge-ops`: ~/.Codex y TodoWrite migrados a $CODEX_HOME y plan de Codex.
- `linear-codex-skill`: Nombre/carpeta, rutas, variables y ejemplo Task(...) migrados; origen preservado.
- `magic-ui-generator`: Delimitador estricto y browser_subagent migrado a navegador/web disponible.
- `planning-with-files`: CLAUDE_PLUGIN_ROOT, TodoWrite y WebSearch migrados a $SKILL_DIR/plan/web.
- `playwright-skill`: Ruta ~/.claude y etiquetas Claude Code migradas a $SKILL_DIR/Codex.
- `seo-plan`: WebFetch/allowed-tools traducidos a web open/search de Codex.
- `startup-business-analyst-market-opportunity`: WebSearch traducido a web search.
- `ui-ux-pro-max`: Comandos hechos portables con $SKILL_DIR y texto de salida actualizado.
- `use-railway`: run_in_background/BashOutput y allowed-tools migrados a sesiones shell/MCP Codex.

## Skills que requieren credenciales

- `apify-actor-development`: Apify CLI + APIFY_TOKEN/login; MCP de documentación opcional.
- `azure-ai-formrecognizer-java`: FORM_RECOGNIZER_ENDPOINT/KEY o identidad Azure; SDK Java.
- `azure-keyvault-keys-ts`: Vault URL/nombre + identidad/RBAC Azure; paquetes npm Azure.
- `azure-monitor-opentelemetry-exporter-py`: APPLICATIONINSIGHTS_CONNECTION_STRING; paquetes Azure/OpenTelemetry Python.
- `azure-monitor-opentelemetry-ts`: APPLICATIONINSIGHTS_CONNECTION_STRING; paquetes npm Azure Monitor.
- `azure-storage-blob-ts`: Connection string, identidad Azure, key o SAS; @azure/storage-blob.
- `cal-com-automation`: Rube MCP + conexión OAuth de Cal.com.
- `freshservice-automation`: Rube MCP + conexión OAuth de Freshservice.
- `hugging-face-tool-builder`: HF_TOKEN para repos privados/gated y mejores límites.
- `langfuse`: Claves Langfuse y del proveedor LLM; SDK Python/TS.
- `linear-codex-skill`: LINEAR_API_KEY u OAuth MCP; fallbacks CLI/scripts descritos pero ausentes.
- `mailchimp-automation`: Rube MCP + OAuth de Mailchimp.
- `supabase-automation`: Rube MCP + conexión OAuth de Supabase.
- `use-railway`: Railway CLI/MCP + OAuth o RAILWAY_API_TOKEN/RAILWAY_TOKEN; jq para GraphQL fallback.

Conexiones condicionales no contadas como credencial obligatoria de activación: `competitor-profiling` (Firecrawl/DataForSEO), `expo-dev-client` (firma al distribuir), `canary-watch` (webhook opcional) y `not-human-search-mcp` (sin autenticación).

## Skills que no pueden migrarse automáticamente por completo

- `ads`: faltan references/{platform-guides,tool-reference,...} y ../../tools/*. Se preservaron las instrucciones y se evitó inventar implementaciones.
- `brand-voice`: faltan references/voice-profile-schema.md. Se preservaron las instrucciones y se evitó inventar implementaciones.
- `competitor-profiling`: faltan references/tool-reference.md, references/templates.md. Se preservaron las instrucciones y se evitó inventar implementaciones.
- `jarvis-os-timer`: faltan skills/timer.py, watcher.sh y bridge runtime. Se preservaron las instrucciones y se evitó inventar implementaciones.
- `jarvis-os-web`: faltan skills/web.py. Se preservaron las instrucciones y se evitó inventar implementaciones.
- `linear-codex-skill`: faltan scripts/*.ts y documentación api/sdk/sync/projects/troubleshooting/labels. Se preservaron las instrucciones y se evitó inventar implementaciones.
- `mediabunny`: faltan get-audio-duration.md, get-video-dimensions.md, get-video-duration.md. Se preservaron las instrucciones y se evitó inventar implementaciones.
- `react-patterns`: faltan rules/react/* y Skills hermanas referenciadas. Se preservaron las instrucciones y se evitó inventar implementaciones.
- `remotion-captions`: faltan display-captions.md, import-srt-captions.md, transcribe-captions.md. Se preservaron las instrucciones y se evitó inventar implementaciones.
- `task-intelligence`: faltan scripts/pre_task_check.py y agent-orchestrator/scripts/*. Se preservaron las instrucciones y se evitó inventar implementaciones.

## Dependencias, scripts, hooks y MCP

- `ads`: MCP/registro de herramientas opcional; faltan guías internas de integración.
- `apify-actor-development`: Apify CLI + APIFY_TOKEN/login; MCP de documentación opcional.
- `audio-transcriber`: Python, faster-whisper/openai-whisper; ffmpeg recomendado; modelos descargables.
- `azure-ai-formrecognizer-java`: FORM_RECOGNIZER_ENDPOINT/KEY o identidad Azure; SDK Java.
- `azure-keyvault-keys-ts`: Vault URL/nombre + identidad/RBAC Azure; paquetes npm Azure.
- `azure-monitor-opentelemetry-exporter-py`: APPLICATIONINSIGHTS_CONNECTION_STRING; paquetes Azure/OpenTelemetry Python.
- `azure-monitor-opentelemetry-ts`: APPLICATIONINSIGHTS_CONNECTION_STRING; paquetes npm Azure Monitor.
- `azure-storage-blob-ts`: Connection string, identidad Azure, key o SAS; @azure/storage-blob.
- `cal-com-automation`: Rube MCP + conexión OAuth de Cal.com.
- `canary-watch`: Webhook Slack/Discord opcional; automatización post-push requiere hook confiable o CI.
- `competitor-profiling`: Firecrawl + DataForSEO MCP; faltan referencias de herramientas y plantillas.
- `expo-dev-client`: Expo/EAS y credenciales de firma Apple/Google solo al distribuir.
- `freshservice-automation`: Rube MCP + conexión OAuth de Freshservice.
- `hugging-face-tool-builder`: HF_TOKEN para repos privados/gated y mejores límites.
- `jarvis-os-timer`: Windows, PowerShell/System.Speech, bridge JARVIS y scripts ausentes.
- `jarvis-os-web`: Windows/PowerShell, duckduckgo-search y script ausente.
- `knowledge-ops`: MCP Memory requerido para la capa semántica; endpoint no especificado.
- `langfuse`: Claves Langfuse y del proveedor LLM; SDK Python/TS.
- `linear-codex-skill`: LINEAR_API_KEY u OAuth MCP; fallbacks CLI/scripts descritos pero ausentes.
- `magic-ui-generator`: Magic MCP opcional o navegador/web; lucide-react y framer-motion al integrar.
- `mailchimp-automation`: Rube MCP + OAuth de Mailchimp.
- `mobile-design`: Script Python incluido; solo biblioteca estándar.
- `not-human-search-mcp`: MCP remoto sin autenticación.
- `planning-with-files`: Scripts Bash y plantillas incluidas.
- `playwright-skill`: Node/npm; setup instala Playwright y Chromium.
- `remotion-docs-demo`: Requiere el monorepo/toolchain de Remotion cuando se activa.
- `remotion-fix-dependabot`: Requiere bun y un monorepo Remotion cuando se activa.
- `remotion-web-renderer-test`: Requiere el monorepo/toolchain de Remotion cuando se activa.
- `seo-fundamentals`: Script Python incluido; solo biblioteca estándar.
- `seo-plan`: DataForSEO MCP opcional.
- `supabase-automation`: Rube MCP + conexión OAuth de Supabase.
- `task-intelligence`: Faltan pre_task_check.py y agent-orchestrator; usar colaboración nativa como sustituto parcial.
- `ui-ux-pro-max`: Scripts Python/CSV incluidos; shadcn MCP opcional.
- `use-railway`: Railway CLI/MCP + OAuth o RAILWAY_API_TOKEN/RAILWAY_TOKEN; jq para GraphQL fallback.

Los cinco directorios sin `SKILL.md` — `benchmark`, `design-html`, `ghengis-meta-prompting`, `ghengis-pql-validation` y `pair-agent` — son artefactos auxiliares, no Skills activables, y no se modificaron.

## Pruebas ejecutadas

- Parseo YAML estricto: 93/93.
- Activación simulada desde `name` + `description`: 93/93.
- Sintaxis de recursos incluidos: Python 13/13, JavaScript 2/2, shell 5/5.
- Barrido de referencias exclusivas: sin `CLAUDE.md`, `CLAUDE_PLUGIN_ROOT`, `~/.claude`, `~/.Codex`, `TodoWrite`, `WebSearch`, `WebFetch`, `Task(...)`, `browser_subagent`, `run_in_background` ni `BashOutput`.
- Persisten dos menciones deliberadas: el URL de procedencia de `linear-codex-skill` y la lista comparativa de harnesses de `use-railway`. No son dependencias exclusivas.

## Matriz por Skill

| Directorio | name | Estado de migración | Activación | Configuración/dependencias |
|---|---|---|---|---|
| `10-andruia-skill-smith` | `10-andruia-skill-smith` | Compatible sin cambios | PASS | — |
| `ads` | `ads` | Requiere intervención manual | PASS | MCP/registro de herramientas opcional; faltan guías internas de integración. |
| `agent-introspection-debugging` | `agent-introspection-debugging` | Compatible sin cambios | PASS | — |
| `antigravity-design-expert` | `antigravity-design-expert` | Corregida | PASS | — |
| `apify-actor-development` | `apify-actor-development` | Corregida | PASS | Apify CLI + APIFY_TOKEN/login; MCP de documentación opcional. |
| `ask-questions-if-underspecified` | `ask-questions-if-underspecified` | Compatible sin cambios | PASS | — |
| `audio-transcriber` | `audio-transcriber` | Corregida | PASS | Python, faster-whisper/openai-whisper; ffmpeg recomendado; modelos descargables. |
| `azure-ai-formrecognizer-java` | `azure-ai-formrecognizer-java` | Compatible sin cambios | PASS | FORM_RECOGNIZER_ENDPOINT/KEY o identidad Azure; SDK Java. |
| `azure-keyvault-keys-ts` | `azure-keyvault-keys-ts` | Compatible sin cambios | PASS | Vault URL/nombre + identidad/RBAC Azure; paquetes npm Azure. |
| `azure-monitor-opentelemetry-exporter-py` | `azure-monitor-opentelemetry-exporter-py` | Compatible sin cambios | PASS | APPLICATIONINSIGHTS_CONNECTION_STRING; paquetes Azure/OpenTelemetry Python. |
| `azure-monitor-opentelemetry-ts` | `azure-monitor-opentelemetry-ts` | Compatible sin cambios | PASS | APPLICATIONINSIGHTS_CONNECTION_STRING; paquetes npm Azure Monitor. |
| `azure-storage-blob-ts` | `azure-storage-blob-ts` | Compatible sin cambios | PASS | Connection string, identidad Azure, key o SAS; @azure/storage-blob. |
| `brand-discovery` | `brand-discovery` | Compatible sin cambios | PASS | — |
| `brand-voice` | `brand-voice` | Requiere intervención manual | PASS | — |
| `bug-hunter` | `bug-hunter` | Compatible sin cambios | PASS | — |
| `cal-com-automation` | `cal-com-automation` | Compatible sin cambios | PASS | Rube MCP + conexión OAuth de Cal.com. |
| `canary-watch` | `canary-watch` | Corregida | PASS | Webhook Slack/Discord opcional; automatización post-push requiere hook confiable o CI. |
| `cc-skill-coding-standards` | `cc-skill-coding-standards` | Compatible sin cambios | PASS | — |
| `cc-skill-project-guidelines-example` | `cc-skill-project-guidelines-example` | Compatible sin cambios | PASS | — |
| `cloud-devops` | `cloud-devops` | Compatible sin cambios | PASS | — |
| `commit` | `commit` | Compatible sin cambios | PASS | — |
| `competitor-profiling` | `competitor-profiling` | Requiere intervención manual | PASS | Firecrawl + DataForSEO MCP; faltan referencias de herramientas y plantillas. |
| `compose-multiplatform-patterns` | `compose-multiplatform-patterns` | Compatible sin cambios | PASS | — |
| `customer-billing-ops` | `customer-billing-ops` | Compatible sin cambios | PASS | — |
| `customer-support` | `customer-support` | Compatible sin cambios | PASS | — |
| `database-optimizer` | `database-optimizer` | Compatible sin cambios | PASS | — |
| `django-patterns` | `django-patterns` | Compatible sin cambios | PASS | — |
| `django-security` | `django-security` | Compatible sin cambios | PASS | — |
| `dwarf-expert` | `dwarf-expert` | Corregida | PASS | — |
| `energy-procurement` | `energy-procurement` | Compatible sin cambios | PASS | — |
| `error-debugging-error-analysis` | `error-debugging-error-analysis` | Compatible sin cambios | PASS | — |
| `expo-dev-client` | `expo-dev-client` | Compatible sin cambios | PASS | Expo/EAS y credenciales de firma Apple/Google solo al distribuir. |
| `freshservice-automation` | `freshservice-automation` | Compatible sin cambios | PASS | Rube MCP + conexión OAuth de Freshservice. |
| `frontend-design-direction` | `frontend-design-direction` | Compatible sin cambios | PASS | — |
| `frontend-dev-guidelines` | `frontend-dev-guidelines` | Compatible sin cambios | PASS | — |
| `ghengis-agent-teams` | `agent-teams` | Corregida | PASS | — |
| `ghengis-learning-paths` | `learning-paths` | Compatible sin cambios | PASS | — |
| `ghengis-writing-skills` | `writing-skills` | Corregida | PASS | — |
| `golang-patterns` | `golang-patterns` | Compatible sin cambios | PASS | — |
| `hig-components-layout` | `hig-components-layout` | Compatible sin cambios | PASS | — |
| `hig-platforms` | `hig-platforms` | Compatible sin cambios | PASS | — |
| `hugging-face-tool-builder` | `hugging-face-tool-builder` | Compatible sin cambios | PASS | HF_TOKEN para repos privados/gated y mejores límites. |
| `indexing-issue-auditor` | `indexing-issue-auditor` | Compatible sin cambios | PASS | — |
| `jarvis-os-timer` | `jarvis-os-timer` | Corregida; requiere intervención manual | PASS | Windows, PowerShell/System.Speech, bridge JARVIS y scripts ausentes. |
| `jarvis-os-web` | `jarvis-os-web` | Corregida; requiere intervención manual | PASS | Windows/PowerShell, duckduckgo-search y script ausente. |
| `javascript-typescript-typescript-scaffold` | `javascript-typescript-typescript-scaffold` | Compatible sin cambios | PASS | — |
| `kaizen` | `kaizen` | Compatible sin cambios | PASS | — |
| `knowledge-ops` | `knowledge-ops` | Corregida | PASS | MCP Memory requerido para la capa semántica; endpoint no especificado. |
| `kotlin-coroutines-expert` | `kotlin-coroutines-expert` | Compatible sin cambios | PASS | — |
| `kotlin-exposed-patterns` | `kotlin-exposed-patterns` | Compatible sin cambios | PASS | — |
| `langfuse` | `langfuse` | Compatible sin cambios | PASS | Claves Langfuse y del proveedor LLM; SDK Python/TS. |
| `linear-codex-skill` | `linear-codex-skill` | Corregida; requiere intervención manual | PASS | LINEAR_API_KEY u OAuth MCP; fallbacks CLI/scripts descritos pero ausentes. |
| `magic-ui-generator` | `magic-ui-generator` | Corregida | PASS | Magic MCP opcional o navegador/web; lucide-react y framer-motion al integrar. |
| `mailchimp-automation` | `mailchimp-automation` | Compatible sin cambios | PASS | Rube MCP + OAuth de Mailchimp. |
| `makepad-reference` | `makepad-reference` | Compatible sin cambios | PASS | — |
| `marketing-psychology` | `marketing-psychology` | Compatible sin cambios | PASS | — |
| `mediabunny` | `mediabunny` | Requiere intervención manual | PASS | — |
| `metasploit-framework` | `metasploit-framework` | Compatible sin cambios | PASS | — |
| `micro-saas-launcher` | `micro-saas-launcher` | Compatible sin cambios | PASS | — |
| `mobile-design` | `mobile-design` | Compatible sin cambios | PASS | Script Python incluido; solo biblioteca estándar. |
| `network-engineer` | `network-engineer` | Compatible sin cambios | PASS | — |
| `network-interface-health` | `network-interface-health` | Compatible sin cambios | PASS | — |
| `not-human-search-mcp` | `not-human-search-mcp` | Compatible sin cambios | PASS | MCP remoto sin autenticación. |
| `observability-engineer` | `observability-engineer` | Compatible sin cambios | PASS | — |
| `pentest-checklist` | `pentest-checklist` | Compatible sin cambios | PASS | — |
| `planning-with-files` | `planning-with-files` | Corregida | PASS | Scripts Bash y plantillas incluidas. |
| `playwright-skill` | `playwright-skill` | Corregida | PASS | Node/npm; setup instala Playwright y Chromium. |
| `production-code-audit` | `production-code-audit` | Compatible sin cambios | PASS | — |
| `react-component-performance` | `react-component-performance` | Compatible sin cambios | PASS | — |
| `react-patterns` | `react-patterns` | Requiere intervención manual | PASS | — |
| `recursive-decision-ledger` | `recursive-decision-ledger` | Compatible sin cambios | PASS | — |
| `remotion-captions` | `remotion-captions` | Requiere intervención manual | PASS | — |
| `remotion-docs-demo` | `docs-demo` | Compatible sin cambios | PASS | Requiere el monorepo/toolchain de Remotion cuando se activa. |
| `remotion-fix-dependabot` | `fix-dependabot` | Compatible sin cambios | PASS | Requiere bun y un monorepo Remotion cuando se activa. |
| `remotion-web-renderer-test` | `web-renderer-test` | Compatible sin cambios | PASS | Requiere el monorepo/toolchain de Remotion cuando se activa. |
| `rootnode-block-selection` | `rootnode-block-selection` | Compatible sin cambios | PASS | — |
| `rootnode-domain-business-strategy` | `rootnode-domain-business-strategy` | Compatible sin cambios | PASS | — |
| `rootnode-domain-research-analysis` | `rootnode-domain-research-analysis` | Compatible sin cambios | PASS | — |
| `rootnode-handoff-trigger-check` | `rootnode-handoff-trigger-check` | Compatible sin cambios | PASS | — |
| `saas-mvp-launcher` | `saas-mvp-launcher` | Compatible sin cambios | PASS | — |
| `seo-content-auditor` | `seo-content-auditor` | Compatible sin cambios | PASS | — |
| `seo-fundamentals` | `seo-fundamentals` | Compatible sin cambios | PASS | Script Python incluido; solo biblioteca estándar. |
| `seo-plan` | `seo-plan` | Corregida | PASS | DataForSEO MCP opcional. |
| `startup-business-analyst-market-opportunity` | `startup-business-analyst-market-opportunity` | Corregida | PASS | — |
| `steve-jobs` | `steve-jobs` | Compatible sin cambios | PASS | — |
| `supabase-automation` | `supabase-automation` | Compatible sin cambios | PASS | Rube MCP + conexión OAuth de Supabase. |
| `task-intelligence` | `task-intelligence` | Requiere intervención manual | PASS | Faltan pre_task_check.py y agent-orchestrator; usar colaboración nativa como sustituto parcial. |
| `threejs-skills` | `threejs-skills` | Compatible sin cambios | PASS | — |
| `track-management` | `track-management` | Compatible sin cambios | PASS | — |
| `ui-ux-pro-max` | `ui-ux-pro-max` | Corregida | PASS | Scripts Python/CSV incluidos; shadcn MCP opcional. |
| `use-railway` | `use-railway` | Corregida | PASS | Railway CLI/MCP + OAuth o RAILWAY_API_TOKEN/RAILWAY_TOKEN; jq para GraphQL fallback. |
| `using-git-worktrees` | `using-git-worktrees` | Compatible sin cambios | PASS | — |
| `xss-html-injection` | `xss-html-injection` | Compatible sin cambios | PASS | — |

## Observaciones no bloqueantes

- 33 descripciones son válidas pero no contienen palabras explícitas como “Use when”; la prueba de activación construye correctamente el prompt a partir de su semántica.
- Seis nombres difieren del directorio por razones históricas (`ghengis-*` y `remotion-*`). Codex los descubre correctamente; no se renombraron para evitar romper referencias externas.
- El validador Python oficial `quick_validate.py` no pudo usarse porque el entorno local no incluye PyYAML. Se usó el parser YAML estándar de Ruby con reglas equivalentes y validación adicional de kebab-case.
- Respaldo previo: `/tmp/claude-skills-before-codex-migration-2026-07-14.tgz`.
