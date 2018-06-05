#! /bin/bash

rm -rf build/
babel -d build/ src/
cp package.json build/package.json