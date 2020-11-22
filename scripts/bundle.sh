#!/bin/sh

BUNDLE_DIR=lib
BUNDLE_FILE=index.js


printf "[1/6] Cleaning $BUNDLE_DIR folder... "
rm -rf $BUNDLE_DIR/*
echo OK


printf "[2/6] Creating $BUNDLE_FILE file... "
node_modules/.bin/rollup -c --compact --silent
echo OK


printf "[3/6] Creating core.css file... "
node_modules/.bin/sass --no-source-map src/core.scss $BUNDLE_DIR/core.css
echo OK


printf "[4/6] Creating core.min.css file... "
node_modules/.bin/sass --no-source-map --style=compressed src/core.scss $BUNDLE_DIR/core.min.css
echo OK


printf "[5/6] Creating theme.css file... "
node_modules/.bin/sass --no-source-map src/theme.scss $BUNDLE_DIR/theme.css
echo OK


printf "[6/6] Creating theme.min.css file... "
node_modules/.bin/sass --no-source-map --style=compressed src/theme.scss $BUNDLE_DIR/theme.min.css
echo OK


exit 0
