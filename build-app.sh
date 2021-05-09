#!/bin/bash 


# Builds Alexandria from source

# building the react app
cd alexandria-react
echo "Building React project..."
yarn build

# removing the old react-build folder 
cd ../electron
echo "Removing old React build folder"
rm -rf react-build

# moving the new build to react-build in the electron folder
mv ../alexandria-react/build ./react-build

# building the electron app
echo "Building the Electron app"
rm -rf dist/
yarn dist

# opening the directory
open dist
echo "Done building Alexandria!"
