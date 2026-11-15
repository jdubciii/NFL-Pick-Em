#!/usr/bin/env python3
"""Compute weekly pick splits for the NFL Pick 'Em league.

Usage:
    python pick-splits.py <picks-file> <games-file>

Picks file: one line per member, one pick per game in games-file order.
    Alex: HOMEA, AWAYB, AWAYC, HOMEC
Games file: one line per game, away team at home team.
    G3 AWAYC at HOMEC

Team codes are matched case-insensitively ('at' or '@' separates the teams),
blank lines and '#' comments are ignored, and the script never needs editing
between weeks.

Prints one line per game with the split and the members on each side, then a
single line listing the closest games (splits within CLOSEST_MARGIN, i.e. 6-4
or tighter).

Nothing in here is week-specific: point it at new picks and games files and it
works unchanged. Standard library only.
"""

import sys
from dataclasses import dataclass

# A game counts as "closest" when the losing side still has at least
# (total - CLOSEST_MARGIN) picks, i.e. a 6-4 split or tighter.
CLOSEST_MARGIN = 2

GAME_SEPARATORS = (" at ", " @ ")
USAGE = "usage: python pick-splits.py <picks-file> <games-file>"


class InputError(Exception):
    """A problem with the user's input files (reported without a traceback)."""


@dataclass
class Game:
    game_id: str
    away: str
    home: str

    @property
    def label(self):
        return f"{self.game_id} {self.away} at {self.home}"


@dataclass
class Split:
    game: Game
    away_names: list
    home_names: list

    @property
    def away_count(self):
        return len(self.away_names)

    @property
    def home_count(self):
        return len(self.home_names)

    @property
    def margin(self):
        return abs(self.away_count - self.home_count)

    @property
    def detail(self):
        return "{} / {}".format(
            render_side(self.game.away, self.away_names),
            render_side(self.game.home, self.home_names),
        )

    @property
    def short(self):
        away, home = self.away_count, self.home_count
        if away == home:
            return f"{self.game.away} {away}-{home} {self.game.home}"
        leader, trailer = (
            (self.game.away, self.game.home) if away > home else (self.game.home, self.game.away)
        )
        high, low = max(away, home), min(away, home)
        return f"{leader} {high}-{low} {trailer}"


def render_side(team, names):
    shown = ", ".join(names) if names else "none"
    return f"{team} {len(names)} ({shown})"


def read_lines(path, kind):
    try:
        with open(path, "r", encoding="utf-8-sig") as handle:
            return handle.read().splitlines()
    except OSError as exc:
        reason = exc.strerror or str(exc)
        raise InputError(f"cannot read {kind} file {path!r}: {reason}")


def iter_content_lines(path, kind):
    """Yield (line number, stripped line) for non-blank, non-comment lines."""
    for lineno, raw in enumerate(read_lines(path, kind), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        yield lineno, line


def parse_games(path):
    games = []
    seen_ids = {}
    for lineno, line in iter_content_lines(path, "games"):
        parsed = _split_game_line(line)
        if parsed is None:
            raise InputError(
                f"{path}: line {lineno}: expected 'G1 AWAY at HOME' but found {line!r}"
            )
        game_id, away, home = parsed
        if game_id.upper() in seen_ids:
            raise InputError(
                f"{path}: line {lineno}: duplicate game {game_id!r} "
                f"(first seen on line {seen_ids[game_id.upper()]})"
            )
        seen_ids[game_id.upper()] = lineno
        games.append(Game(game_id=game_id.upper(), away=away, home=home))

    if not games:
        raise InputError(f"{path}: no games found")
    return games


def _split_game_line(line):
    lowered = line.lower()
    for separator in GAME_SEPARATORS:
        index = lowered.find(separator)
        if index == -1:
            continue
        left = line[:index].split()
        right = line[index + len(separator):].split()
        if len(left) == 2 and len(right) == 1:
            return left[0].upper(), left[1].upper(), right[0].upper()
    return None


def parse_picks(path):
    members = []
    first_seen = {}
    for lineno, line in iter_content_lines(path, "picks"):
        if ":" not in line:
            raise InputError(
                f"{path}: line {lineno}: expected 'Name: TEAM, TEAM, ...' but found {line!r}"
            )
        name, rest = line.split(":", 1)
        name = name.strip()
        if not name:
            raise InputError(f"{path}: line {lineno}: missing member name before ':'")
        key = name.casefold()
        if key in first_seen:
            raise InputError(
                f"{path}: line {lineno}: duplicate member {name!r} "
                f"(first seen on line {first_seen[key]})"
            )
        first_seen[key] = lineno
        picks = [pick.strip().upper() for pick in rest.split(",") if pick.strip()]
        members.append((name, picks, lineno))

    if not members:
        raise InputError(f"{path}: no members found")
    return members


def validate_picks(members, games, path):
    problems = []
    expected = len(games)
    for name, picks, lineno in members:
        if len(picks) != expected:
            problems.append(
                f"{path}: line {lineno}: {name!r} has {len(picks)} pick(s) "
                f"but there are {expected} game(s)"
            )
            continue
        for game, pick in zip(games, picks):
            if pick not in (game.away, game.home):
                problems.append(
                    f"{path}: line {lineno}: {name!r} picked {pick} for {game.label}, "
                    f"which is neither {game.away} nor {game.home}"
                )
    if problems:
        raise InputError("\n".join(problems))


def build_splits(members, games):
    splits = []
    for index, game in enumerate(games):
        away_names, home_names = [], []
        for name, picks, _ in members:
            target = away_names if picks[index] == game.away else home_names
            target.append(name)
        splits.append(Split(game=game, away_names=away_names, home_names=home_names))
    return splits


def main(argv):
    if len(argv) != 3:
        print(USAGE, file=sys.stderr)
        return 2

    picks_path, games_path = argv[1], argv[2]
    try:
        games = parse_games(games_path)
        members = parse_picks(picks_path)
        validate_picks(members, games, picks_path)
        splits = build_splits(members, games)
    except InputError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    for split in splits:
        print(f"{split.game.label}: {split.detail}")

    closest = [split for split in splits if split.margin <= CLOSEST_MARGIN]
    closest.sort(key=lambda split: split.margin)  # stable: ties keep game order
    if closest:
        summary = ", ".join(split.short for split in closest)
        print(f"\nClosest games (6-4 or closer): {summary}")
    else:
        print("\nClosest games (6-4 or closer): none")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
