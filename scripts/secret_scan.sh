#!/usr/bin/env bash
git rev-list --all | xargs git grep -nE "eyJ[A-Za-z0-9_-]{20,}|sb_(publishable|secret)_[A-Za-z0-9_-]+|postgres(ql)?://[^:/]+:[^@ ]+@" --exclude-dir=tests || echo "Clean"
