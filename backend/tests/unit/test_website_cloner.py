# backend/tests/unit/test_website_cloner.py
import pytest
from app.services.website_cloner_service import WebsiteClonerService


def test_inspect_known_profile_mpwik():
    cloner = WebsiteClonerService.get_instance()
    res = cloner.inspect_real_website("https://www.mpwik.wroc.pl")
    assert res["domain"] == "www.mpwik.wroc.pl"
    assert "MPWiK" in res["brand_name"]
    assert len(res["nav_links"]) > 0


def test_inspect_generic_url():
    cloner = WebsiteClonerService.get_instance()
    res = cloner.inspect_real_website("https://example-hospital-wroclaw.org/info")
    assert "example-hospital-wroclaw.org" in res["domain"]
    assert res["status"] in ["LIVE_FETCHED", "GENERIC_SYNTHESIZED"]


def test_clone_and_spoof_website_seniors():
    cloner = WebsiteClonerService.get_instance()
    res = cloner.clone_and_spoof_website(
        url="https://www.mpwik.wroc.pl",
        audience_mode="seniors",
        language="pl"
    )
    assert res["platform_mock"] == "BROWSER"
    assert res["threat_category"] == "PHISHING"
    assert "cloned_website" in res
    assert res["cloned_website"]["spoofed_domain"] == "mpwik-wroclaw.pl.awaria-wodociagi.cc"
    assert res["cloned_website"]["real_domain"] == "www.mpwik.wroc.pl"
    assert len(res["red_flags"]) >= 3
    assert "994" in res["safe_action_advice"]


def test_clone_and_spoof_website_kids():
    cloner = WebsiteClonerService.get_instance()
    res = cloner.clone_and_spoof_website(
        url="https://portal.librus.pl",
        audience_mode="kids",
        language="pl"
    )
    assert res["cloned_website"]["spoofed_domain"] == "synergia-librus.pl.szkolny-portal.cc"
    assert len(res["red_flags"]) >= 3
    assert "Librus" in res["safe_action_advice"]
