# backend/app/platform/plugin_registry.py
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Protocol
from fastapi import APIRouter
from pydantic import BaseModel, Field


class ModuleMetadata(BaseModel):
    module_id: str = Field(..., description="Unique slug e.g. m1_disinfo, m2_scam_lab")
    number: int = Field(..., ge=1, le=5)
    title: str
    short_title: str
    description: str
    route_prefix: str
    frontend_route: str
    resilience_dimension: str
    adk_pattern: str
    supported_models: List[str]
    rag_corpus_domain: str
    status: str = "ACTIVE"


@dataclass
class GoldenEvalCase:
    case_id: str
    module_id: str
    description: str
    input_payload: Dict[str, Any]
    validator_fn: Callable[[Any], bool]


class DigitalHygieneModulePlugin(Protocol):
    def get_metadata(self) -> ModuleMetadata:
        ...

    def get_router(self) -> APIRouter:
        ...

    def get_golden_eval_cases(self) -> List[GoldenEvalCase]:
        ...


class PlatformRegistry:
    """
    Central registry for the 5 Digital Hygiene Platform modules.
    Mounts module routers automatically and exposes unified discovery & evaluation APIs.
    """

    def __init__(self):
        self._modules: Dict[str, DigitalHygieneModulePlugin] = {}

    def register(self, plugin: DigitalHygieneModulePlugin) -> None:
        meta = plugin.get_metadata()
        self._modules[meta.module_id] = plugin

    def list_modules(self) -> List[ModuleMetadata]:
        return sorted(
            [m.get_metadata() for m in self._modules.values()],
            key=lambda x: x.number,
        )

    def get_plugin(self, module_id: str) -> Optional[DigitalHygieneModulePlugin]:
        return self._modules.get(module_id)

    def mount_all_routers(self, root_app_or_router: Any, base_prefix: str = "/api/v1/modules") -> None:
        for plugin in self._modules.values():
            meta = plugin.get_metadata()
            root_app_or_router.include_router(
                plugin.get_router(),
                prefix=f"{base_prefix}/{meta.route_prefix.strip('/')}",
                tags=[f"Module {meta.number}: {meta.short_title}"],
            )

    def collect_all_eval_cases(self) -> List[GoldenEvalCase]:
        cases: List[GoldenEvalCase] = []
        for plugin in self._modules.values():
            cases.extend(plugin.get_golden_eval_cases())
        return cases


platform_registry = PlatformRegistry()
