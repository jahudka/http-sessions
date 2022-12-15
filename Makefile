.PHONY: default
default: build

node_modules:
	npm install

.PHONY: clean
clean:
	rm -rf lib

.PHONY: cleanall
cleanall: clean
	rm -rf node_modules

.PHONY: build
build: node_modules clean
	node_modules/.bin/tsc

.PHONY: lint
lint: node_modules
	node_modules/.bin/eslint --fix 'src/**/*.ts'
