#!/bin/sh

BUNDLE_DECLARATION_FILE=index.d.ts
BUNDLE_DIR=lib
BUNDLE_FILE=index.js


printf "[1/7] Cleaning $BUNDLE_DIR folder... "
rm -rf $BUNDLE_DIR/*
echo OK


printf "[2/7] Creating $BUNDLE_FILE file... "
./node_modules/.bin/rollup -c --compact --silent
echo OK


printf "[3/7] Creating $BUNDLE_DECLARATION_FILE file... "
find $BUNDLE_DIR -type f -name *.d.ts -printf '%f\n' | sed 's/.d.ts//' | sed "s@.*@export * from './&';@" > $BUNDLE_DIR/$BUNDLE_DECLARATION_FILE
echo OK


printf "[4/7] Creating core.css file... "
./node_modules/.bin/sass --no-source-map ./src/core.scss $BUNDLE_DIR/core.css
echo OK


printf "[5/7] Creating core.min.css file... "
./node_modules/.bin/sass --no-source-map --style=compressed ./src/core.scss $BUNDLE_DIR/core.min.css
echo OK


printf "[6/7] Creating theme.css file... "
./node_modules/.bin/sass --no-source-map ./src/theme.scss $BUNDLE_DIR/theme.css
echo OK


printf "[7/7] Creating theme.min.css file... "
./node_modules/.bin/sass --no-source-map --style=compressed ./src/theme.scss $BUNDLE_DIR/theme.min.css
echo OK


exit 0
