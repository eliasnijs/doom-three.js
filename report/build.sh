#!/bin/sh

rm -rf build
mkdir -p build
pdflatex -shell-escape -output-directory=bin main.tex
bibtex build/main
pdflatex -shell-escape -output-directory=bin main.tex
pdflatex -shell-escape -output-directory=bin main.tex
cp bin/main.pdf .

