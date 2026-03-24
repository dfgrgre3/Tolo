const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const reportPath = path.resolve(".lint-warnings.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8").replace(/^\uFEFF/, ""));

const unusedByFile = new Map();

for (const entry of report) {
  const names = new Set();
  for (const message of entry.messages) {
    if (message.ruleId !== "@typescript-eslint/no-unused-vars") {
      continue;
    }

    const match = message.message.match(/'([^']+)'/);
    if (match) {
      names.add(match[1]);
    }
  }

  if (names.size > 0) {
    unusedByFile.set(path.resolve(entry.filePath), names);
  }
}


function parseCode(code) {
  return parser.parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
}

for (const [filePath, names] of unusedByFile) {
  const original = fs.readFileSync(filePath, "utf8");
  const ast = parseCode(original);
  let changed = false;

  traverse(ast, {
    ImportDeclaration(importPath) {
      importPath.node.specifiers = importPath.node.specifiers.filter((specifier) => {
        if (
          (t.isImportSpecifier(specifier) ||
            t.isImportDefaultSpecifier(specifier) ||
            t.isImportNamespaceSpecifier(specifier)) &&
          names.has(specifier.local.name)
        ) {
          changed = true;
          return false;
        }
        return true;
      });

      if (importPath.node.specifiers.length === 0) {
        importPath.remove();
        changed = true;
      }
    },
    VariableDeclarator(varPath) {
      const { id } = varPath.node;

      if (t.isIdentifier(id) && names.has(id.name)) {
        id.name = `_${id.name.replace(/^_+/, "")}`;
        changed = true;
        return;
      }

      if (t.isArrayPattern(id)) {
        id.elements.forEach((element, index) => {
          if (!element) return;

          if (t.isIdentifier(element) && names.has(element.name)) {
            id.elements[index] = null;
            changed = true;
            return;
          }

          if (
            t.isAssignmentPattern(element) &&
            t.isIdentifier(element.left) &&
            names.has(element.left.name)
          ) {
            id.elements[index] = null;
            changed = true;
          }
        });
      }

      if (t.isObjectPattern(id)) {
        id.properties.forEach((property) => {
          if (t.isObjectProperty(property) && t.isIdentifier(property.value) && names.has(property.value.name)) {
            property.value.name = `_${property.value.name.replace(/^_+/, "")}`;
            changed = true;
          }
        });
      }
    },
    Function(pathRef) {
      for (const param of pathRef.node.params) {
        if (t.isIdentifier(param) && names.has(param.name)) {
          param.name = `_${param.name.replace(/^_+/, "")}`;
          changed = true;
        } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left) && names.has(param.left.name)) {
          param.left.name = `_${param.left.name.replace(/^_+/, "")}`;
          changed = true;
        }
      }
    },
    CatchClause(pathRef) {
      if (pathRef.node.param && t.isIdentifier(pathRef.node.param) && names.has(pathRef.node.param.name)) {
        pathRef.node.param.name = `_${pathRef.node.param.name.replace(/^_+/, "")}`;
        changed = true;
      }
    },
  });

  if (changed) {
    const output = generate(ast, { retainLines: true }, original).code;
    fs.writeFileSync(filePath, output);
  }
}
