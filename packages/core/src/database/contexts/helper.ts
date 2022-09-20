import { sql, ValueExpression } from "slonik";

export function joinIdentifier(identifier: string[]) {
  return sql.join(
    identifier.map((value) => sql.identifier([value])),
    sql`,`,
  );
}

export function joinComma(values: ValueExpression[]) {
  return sql.join(values, sql`,`);
}

export function joinAnd(values: ValueExpression[]) {
  return sql.join(values, sql` AND `);
}
