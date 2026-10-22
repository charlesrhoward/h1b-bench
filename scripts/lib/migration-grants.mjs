// A lexical source guard. Database assertions verify the actual privileges.
const word = /[\p{L}\p{N}_$]/u

function quoted(sql, start, quote) {
  let value = ''
  let end = start + 1
  while (end < sql.length) {
    if (sql[end] !== quote) value += sql[end++]
    else if (sql[end + 1] === quote) { value += quote; end += 2 }
    else return { value, end: end + 1 }
  }
  throw new Error('Unterminated SQL quote')
}

function blockCommentEnd(sql, start) {
  let depth = 1
  let end = start + 2
  while (end < sql.length && depth) {
    if (sql.slice(end, end + 2) === '/*') { depth++; end += 2 }
    else if (sql.slice(end, end + 2) === '*/') { depth--; end += 2 }
    else end++
  }
  if (depth) throw new Error('Unterminated SQL comment')
  return end
}

function dollarToken(sql, index, delimiter) {
  const end = sql.indexOf(delimiter, index + delimiter.length)
  if (end < 0) throw new Error('Unterminated dollar-quoted SQL')
  return { token: { type: 'body', value: sql.slice(index + delimiter.length, end) },
    next: end + delimiter.length }
}

function wordToken(sql, index) {
  let next = index + 1
  while (next < sql.length && word.test(sql[next])) next++
  return { token: { type: 'word', value: sql.slice(index, next).toLowerCase() }, next }
}

function quotedToken(sql, index) {
  const result = quoted(sql, index, sql[index])
  return { token: { type: sql[index] === '"' ? 'identifier' : 'string', value: result.value }, next: result.end }
}

function nextToken(sql, index) {
  const rest = sql.slice(index)
  if (/^\s/.test(rest)) return { next: index + 1 }
  if (rest.startsWith('--')) {
    const newline = sql.indexOf('\n', index)
    return { next: newline < 0 ? sql.length : newline + 1 }
  }
  if (rest.startsWith('/*')) return { next: blockCommentEnd(sql, index) }
  const dollar = rest.match(/^\$(?:[A-Za-z_]\w*)?\$/)
  if (dollar) return dollarToken(sql, index, dollar[0])
  if (['"', "'"].includes(sql[index])) return quotedToken(sql, index)
  if (word.test(sql[index])) return wordToken(sql, index)
  return { token: { type: 'symbol', value: sql[index] }, next: index + 1 }
}

export function tokenize(sql) {
  const tokens = []
  let index = 0
  while (index < sql.length) {
    const { token, next } = nextToken(sql, index)
    if (token) tokens.push(token)
    index = next
  }
  return tokens
}

function statements(tokens) {
  const result = [[]]
  for (const token of tokens) {
    if (token.type === 'symbol' && token.value === ';') result.push([])
    else result.at(-1).push(token)
  }
  return result.filter((statement) => statement.length)
}

const isWord = (token, value) => token?.type === 'word' && token.value === value
const isIdentifier = (token) => ['word', 'identifier'].includes(token?.type)

function relationAt(tokens, index, kind = 'table') {
  if (!isIdentifier(tokens[index])) return null
  let schema = 'public'
  let name = tokens[index].value
  let next = index + 1
  if (tokens[next]?.value === '.') {
    schema = name
    name = tokens[next + 1]?.value
    if (!isIdentifier(tokens[next + 1])) return null
    next += 2
  }
  return { schema, name, kind, next, key: JSON.stringify([schema, name, kind]) }
}

function skipIfNotExists(tokens, index) {
  return ['if', 'not', 'exists'].every((value, offset) => isWord(tokens[index + offset], value)) ? index + 3 : index
}

function creationAt(tokens, index) {
  let next = index + 1
  if (isWord(tokens[next], 'or') && isWord(tokens[next + 1], 'replace')) next += 2
  if (['unlogged', 'temporary', 'temp', 'materialized', 'foreign'].some((value) => isWord(tokens[next], value))) next++
  const kind = tokens[next]?.value
  if (!['table', 'view', 'sequence'].includes(kind)) return null
  return relationAt(tokens, skipIfNotExists(tokens, next + 1), kind === 'sequence' ? 'sequence' : 'table')
}

function createdRelations(tokens) {
  return tokens.map((token, index) => isWord(token, 'create') ? creationAt(tokens, index) : null)
    .filter((relation) => relation?.schema === 'public')
}

function checkBlanket(statement, start, on, problems) {
  const clause = statement.slice(on + 1)
  const to = clause.findIndex((token) => isWord(token, 'to') || isWord(token, 'from'))
  const schemas = clause.slice(4, to < 0 ? undefined : to)
  if (['tables', 'sequences'].includes(clause[1]?.value)
    && schemas.some((token) => isIdentifier(token) && token.value === 'public')
    && isWord(statement[start], 'grant')) problems.push('uses a blanket public-schema grant')
}

function namedTargets(statement, next, kind) {
  const result = []
  while (next < statement.length) {
    const relation = relationAt(statement, next, kind)
    if (!relation) break
    next = relation.next
    if (relation.schema === 'public') result.push(relation.key)
    if (statement[next]?.value !== ',') break
    next++
  }
  const hasRecipient = statement.slice(next).some((token) => isWord(token, 'to') || isWord(token, 'from'))
  return hasRecipient ? result : []
}

function privilegeTargets(statement, problems) {
  const start = statement.findIndex((token) => isWord(token, 'grant') || isWord(token, 'revoke'))
  if (start < 0) return []
  const on = statement.findIndex((token, index) => index > start && isWord(token, 'on'))
  if (on < 0) return []
  let next = on + 1
  if (isWord(statement[next], 'all')) {
    checkBlanket(statement, start, on, problems)
    return []
  }
  const kind = isWord(statement[next], 'sequence') ? 'sequence' : 'table'
  if (['table', 'sequence'].some((value) => isWord(statement[next], value))) next++
  else if (['function', 'procedure', 'schema', 'type', 'database', 'routine'].some((value) => isWord(statement[next], value))) return []
  return namedTargets(statement, next, kind)
}

function inspectRoutineBodies(statement, problems) {
  for (const token of statement.filter((item) => item.type === 'body')) {
    const inner = tokenize(token.value)
    if (createdRelations(inner).length || inner.some((item) => isWord(item, 'execute'))) {
      problems.push('uses runtime object DDL or dynamic EXECUTE in a routine; use explicit schema SQL')
    }
  }
}

function expandBlocks(tokens, problems) {
  const expanded = []
  for (const statement of statements(tokens)) {
    if (isWord(statement[0], 'do')) {
      const body = statement.find((token) => ['body', 'string'].includes(token.type))
      if (!body) { problems.push('cannot inspect DO block'); continue }
      const inner = tokenize(body.value)
      if (inner.some((token) => isWord(token, 'execute'))) {
        problems.push('uses dynamic EXECUTE in a DO block; move object DDL into explicit SQL')
      }
      expanded.push(...expandBlocks(inner, problems))
    } else {
      inspectRoutineBodies(statement, problems)
      expanded.push(statement)
    }
  }
  return expanded
}

export function findGrantProblems(sql) {
  const problems = []
  const parsed = expandBlocks(tokenize(sql), problems)
  const decisions = new Set(parsed.flatMap((statement) => privilegeTargets(statement, problems)))
  for (const relation of parsed.flatMap(createdRelations)) {
    if (!decisions.has(relation.key)) {
      problems.push(`creates public.${relation.name} without a matching ${relation.kind} GRANT or REVOKE in the same file`)
    }
  }
  return [...new Set(problems)]
}
