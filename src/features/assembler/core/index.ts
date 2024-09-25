import { Mnemonic } from '@/common/constants'
import { invariant } from '@/common/utils'

import {
  AssembleEndOfMemoryError,
  DuplicateLabelError,
  OperandLabelNotExistError,
} from './exceptions'
import { type Operand, OperandType, parse, type Statement } from './parser'

export type { AssemblerErrorObject } from './exceptions'
export { AssemblerError } from './exceptions'
export type { Statement } from './parser'
export type { SourceRange } from './types'

interface LabelToAddressMap {
  [labelIdentifier: string]: number
}

const getLabelToAddressMap = (statements: Statement[]): LabelToAddressMap => {
  const labelToAddressMap: LabelToAddressMap = {}
  const statementCount = statements.length
  for (let address = 0, statementIndex = 0; statementIndex < statementCount; statementIndex++) {
    const statement = statements[statementIndex]
    const { label, instruction, operands, codes } = statement
    if (label !== null) {
      if (label.identifier in labelToAddressMap) {
        throw new DuplicateLabelError(label)
      }
      labelToAddressMap[label.identifier] = address
    }
    const firstOperand = operands[0] as Operand | undefined
    if (instruction.mnemonic === Mnemonic.ORG) {
      invariant(typeof firstOperand?.code === 'number')
      address = firstOperand.code
    } else {
      // label value has not been calculated yet
      address += codes.length + (firstOperand?.type === OperandType.Label ? 1 : 0)
      if (address > 0xff && statementIndex !== statementCount - 1) {
        throw new AssembleEndOfMemoryError(statement)
      }
    }
  }
  return labelToAddressMap
}

export interface AddressToCodeMap {
  [address: number]: number
}

export interface AddressToStatementMap {
  [address: number]: Statement
}

export type AssembleResult = [AddressToCodeMap, Partial<AddressToStatementMap>]

export const assemble = (source: string): AssembleResult => {
  const statements = parse(source)
  const labelToAddressMap = getLabelToAddressMap(statements)
  const addressToCodeMap: AddressToCodeMap = {}
  const addressToStatementMap: AddressToStatementMap = {}
  const statementCount = statements.length
  for (let address = 0, statementIndex = 0; statementIndex < statementCount; statementIndex++) {
    const statement = statements[statementIndex]
    const { instruction, operands, codes } = statement
    const firstOperand = operands[0] as Operand | undefined
    if (instruction.mnemonic === Mnemonic.ORG) {
      invariant(typeof firstOperand?.code === 'number')
      address = firstOperand.code
      continue
    }

    // Reemplazar etiquetas por direcciones
    operands.forEach((operand) => {
      if (operand.type === OperandType.Label) {
        if (!(operand.value in labelToAddressMap)) {
          throw new OperandLabelNotExistError(operand)
        }
        operand.code = labelToAddressMap[operand.value]
      }
    })

    const nextAddress = address + codes.length
    codes.forEach((code, codeIndex) => {
      addressToCodeMap[address + codeIndex] = code
    })
    addressToStatementMap[address] = statement
    address = nextAddress
  }
  return [addressToCodeMap, addressToStatementMap]
}
