#!/usr/bin/env python3
import sys
import argparse
import json
import math
import re
from typing import Dict, Tuple, Optional, List

# Gyromagnetic ratios provided as gamma/(2*pi) in Hz/T unless noted
# Values sourced from standard NMR/ESR references. Signs retained when standard.
_GYRO_HZ_PER_T: Dict[str, float] = {
    # NMR nuclei
    "1h": 42_577_478.92,  # proton, 1H
    "proton": 42_577_478.92,
    "hydrogen-1": 42_577_478.92,
    "h1": 42_577_478.92,
    "2h": 6_536_000.0,    # deuteron
    "deuteron": 6_536_000.0,
    "d2": 6_536_000.0,
    "3he": 32_434_099.66, # helium-3
    "he3": 32_434_099.66,
    "13c": 10_708_400.0,
    "carbon-13": 10_708_400.0,
    "19f": 40_053_000.0,
    "fluorine-19": 40_053_000.0,
    "23na": 11_262_000.0,
    "sodium-23": 11_262_000.0,
    "31p": 17_235_000.0,
    "phosphorus-31": 17_235_000.0,
    "29si": 8_465_000.0,
    "7li": 16_546_000.0,
    "15n": -4_316_000.0,   # negative gamma
    # Particles
    "electron": -28_024_951_640.0,  # ESR, gamma/(2*pi) ~ -28.02495164 GHz/T
    "e-": -28_024_951_640.0,
    "neutron": -29_164_694.3,
}

# Unit multipliers to Tesla
_UNIT_TO_T: Dict[str, float] = {
    "t": 1.0,
    "tesla": 1.0,
    "mt": 1e-3,
    "millitesla": 1e-3,
    "ut": 1e-6,
    "µt": 1e-6,
    "microtesla": 1e-6,
    "nt": 1e-9,
    "nanotesla": 1e-9,
    "g": 1e-4,          # gauss
    "gauss": 1e-4,
    "mg": 1e-7,
    "kg": 0.1,
}

_NUM_UNIT_RE = re.compile(r"^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*([A-Za-zµ]+)?\s*$")


def normalize_key(name: str) -> str:
    return name.strip().lower().replace(" ", "").replace("_", "")


def get_gamma_hz_per_t(particle: Optional[str], gamma: Optional[float], gamma_unit: str) -> float:
    if gamma is not None:
        if gamma_unit == "Hz/T":
            return float(gamma)
        elif gamma_unit == "rad/s/T":
            return float(gamma) / (2.0 * math.pi)
        else:
            raise ValueError(f"Unsupported gamma unit: {gamma_unit}")
    if not particle:
        # Default to proton
        return _GYRO_HZ_PER_T["proton"]
    key = normalize_key(particle)
    if key not in _GYRO_HZ_PER_T:
        raise KeyError(f"Unknown particle '{particle}'. Known: {', '.join(sorted(_GYRO_HZ_PER_T.keys()))}")
    return _GYRO_HZ_PER_T[key]


def unit_to_tesla_multiplier(unit: Optional[str], default_unit: str) -> float:
    if unit is None:
        unit = default_unit
    key = normalize_key(unit)
    if key not in _UNIT_TO_T:
        raise KeyError(f"Unknown unit '{unit}'. Supported: {', '.join(sorted(_UNIT_TO_T.keys()))}")
    return _UNIT_TO_T[key]


def parse_scalar_with_optional_unit(token: str, default_unit: str) -> float:
    m = _NUM_UNIT_RE.match(token)
    if not m:
        raise ValueError(f"Cannot parse scalar value '{token}'")
    value = float(m.group(1))
    unit = m.group(2)
    mult = unit_to_tesla_multiplier(unit, default_unit)
    return value * mult


def parse_line_to_tesla(line: str, input_format: str, default_unit: str) -> float:
    s = line.strip()
    if not s:
        raise ValueError("Empty line")

    if input_format == "json" or (input_format == "auto" and s.startswith("{")):
        obj = json.loads(s)
        if "b" in obj:
            unit = obj.get("unit", default_unit)
            return float(obj["b"]) * unit_to_tesla_multiplier(unit, default_unit)
        # vector form
        if all(k in obj for k in ("bx", "by", "bz")):
            unit = obj.get("unit", default_unit)
            mult = unit_to_tesla_multiplier(unit, default_unit)
            bx = float(obj["bx"]) * mult
            by = float(obj["by"]) * mult
            bz = float(obj["bz"]) * mult
            return math.sqrt(bx*bx + by*by + bz*bz)
        raise ValueError("JSON must contain 'b' or ('bx','by','bz')")

    # tokenized path
    tokens = s.split()
    if input_format in ("scalar", "auto") and len(tokens) == 1:
        return parse_scalar_with_optional_unit(tokens[0], default_unit)

    # vector: 2 or 3 components, optional common unit as last token
    maybe_unit = None
    if tokens and normalize_key(tokens[-1]) in _UNIT_TO_T:
        maybe_unit = tokens[-1]
        tokens = tokens[:-1]
    if input_format in ("vector", "auto") and len(tokens) in (2, 3):
        # allow unit directly suffixed per token or common trailing
        values_t: List[float] = []
        for t in tokens:
            if _NUM_UNIT_RE.match(t):
                values_t.append(parse_scalar_with_optional_unit(t, default_unit))
            else:
                # plain number; apply maybe_unit or default_unit
                v = float(t)
                mult = unit_to_tesla_multiplier(maybe_unit, default_unit)
                values_t.append(v * mult)
        bx, by = values_t[0], values_t[1]
        bz = values_t[2] if len(values_t) == 3 else 0.0
        return math.sqrt(bx*bx + by*by + bz*bz)

    # fallback: try parsing as scalar with optional unit
    return parse_scalar_with_optional_unit(s, default_unit)


def compute_outputs(b_t: float, gamma_hz_per_t: float, mode: str, signed: bool) -> Tuple[str, float]:
    gamma_use = gamma_hz_per_t if signed else abs(gamma_hz_per_t)
    f_hz = gamma_use * b_t
    if mode == "f_Hz":
        return (f"{f_hz:.9f}", f_hz)
    if mode == "f_kHz":
        return (f"{f_hz / 1e3:.9f}", f_hz)
    if mode == "f_MHz":
        return (f"{f_hz / 1e6:.9f}", f_hz)
    if mode == "f_GHz":
        return (f"{f_hz / 1e9:.9f}", f_hz)
    if mode == "omega_rad_s":
        omega = f_hz * 2.0 * math.pi
        return (f"{omega:.9f}", f_hz)
    if mode == "period_s":
        if f_hz == 0.0:
            return ("inf", f_hz)
        return (f"{1.0 / f_hz:.12f}", f_hz)
    raise ValueError(f"Unsupported output mode: {mode}")


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description=(
            "Compute Larmor frequency from streaming magnetic field readings. "
            "Reads lines from stdin (scalar with units, vector, or JSON)."
        )
    )
    p.add_argument("--particle", type=str, default="proton",
                   help="Particle/nucleus name (e.g., proton, 1H, 13C, electron)")
    p.add_argument("--gamma", type=float, default=None,
                   help="Override gyromagnetic ratio value")
    p.add_argument("--gamma-unit", choices=["Hz/T", "rad/s/T"], default="Hz/T",
                   help="Unit of --gamma if provided")
    p.add_argument("--signed", action="store_true",
                   help="Preserve sign of gamma (default prints magnitude)")
    p.add_argument("--input-format", choices=["auto", "scalar", "vector", "json"], default="auto",
                   help="Expected input line format")
    p.add_argument("--default-unit", type=str, default="uT",
                   help="Default unit when not specified in data (e.g., uT, mT, T, G)")
    p.add_argument("--output", choices=["f_Hz", "f_kHz", "f_MHz", "f_GHz", "omega_rad_s", "period_s"],
                   default="f_Hz", help="Output quantity")
    p.add_argument("--csv", action="store_true",
                   help="Output CSV with columns: b_T,f_Hz,output")
    p.add_argument("--quiet", action="store_true",
                   help="Suppress parse errors; skip bad lines")
    return p


def main(argv: Optional[List[str]] = None) -> int:
    args = build_arg_parser().parse_args(argv)
    try:
        gamma_hz_per_t = get_gamma_hz_per_t(args.particle, args.gamma, args.gamma_unit)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 2

    if args.csv:
        print("b_T,f_Hz,output")

    for raw in sys.stdin:
        line = raw.rstrip("\n")
        if not line.strip():
            continue
        try:
            b_t = parse_line_to_tesla(line, args.input_format, args.default_unit)
            out_str, f_hz = compute_outputs(b_t, gamma_hz_per_t, args.output, args.signed)
            if args.csv:
                print(f"{b_t:.12e},{f_hz:.12e},{out_str}")
            else:
                print(out_str)
        except Exception as e:
            if args.quiet:
                continue
            print(f"parse_error: {e}; line='{line}'", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
