#!/bin/sh

printf "Removing custom rules... "
JS_FILES=$(find ./lint-rules -name "*.js")
for FILE in $JS_FILES; do
  rm $FILE
done
echo OK

printf "Compiling custom rules... "
TS_FILES=$(find ./lint-rules -name "*.ts")
for FILE in $TS_FILES; do
  tsc $FILE
done
echo OK

echo Linting app...
./node_modules/.bin/tslint --project tsconfig.json --config tslint.json 'src/**/*.ts' || true
