#!/bin/sh
# Rebuild data/foods.json and data/recipes-starter.json from the public USDA download.
# Usage (from the repository root): sh tools/fooddb/build.sh
set -e
WORK=${WORK:-/tmp/fooddb}; mkdir -p "$WORK"; export WORK
if [ ! -d "$WORK/FoodData_Central_sr_legacy_food_csv_2018-04" ]; then
  curl -sS -o "$WORK/sr.zip" "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip"
  (cd "$WORK" && unzip -o -q sr.zip)
fi
export USDA_DIR="$WORK/FoodData_Central_sr_legacy_food_csv_2018-04"
(cd "$USDA_DIR" && python3 "$OLDPWD/tools/fooddb/usda_filter.py")
python3 tools/fooddb/usda_build.py
cp "$WORK/foods_usda.json" data/foods.json
FOODS=data/foods.json python3 tools/fooddb/starter_recipes.py > data/recipes-starter.json
echo "done: data/foods.json and data/recipes-starter.json"
