STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep ".ts$")
if [[ "$STAGED_FILES" = "" ]]; then
    exit 0
fi

jest  --bail --findRelatedTests $STAGED_FILES