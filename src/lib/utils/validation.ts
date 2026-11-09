export function symbolFor(Model: Function): symbol {
  return Symbol.for(`IModelValidator<${Model.name}>`)
}

export default { symbolFor }
