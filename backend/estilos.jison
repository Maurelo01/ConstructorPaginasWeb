/* ----- ANALIZADOR LÉXICO ----- */
%lex
%options case-sensitive

%%
\s+ {}
\/\*[\s\S]*?\*\/ {}

"@for" return 'R_FOR';
"from" return 'R_FROM';
"through" return 'R_THROUGH';
"to" return 'R_TO';
"extends" return 'R_EXTENDS';
"px" return 'R_PX';
"%" return 'R_PORC';

/* ----- Variables ----- */
"$"[a-zA-Z_][a-zA-Z0-9_]* return 'VARIABLE';
"#"([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b return 'HEX';

/* ----- Identificadores ----- */
[a-zA-Z_][a-zA-Z0-9_\-]* return 'ID';

/* ----- Números enteros/decimales ----- */
[0-9]+("."[0-9]+)? return 'NUMERO';
"{" return 'LLAVE_IZQ';
"}" return 'LLAVE_DER';
"(" return 'PAR_IZQ';
")" return 'PAR_DER';
"=" return 'IGUAL';
";" return 'PUNTOCOMA';
"," return 'COMA';

/* ----- Operadores ----- */
"+" return 'MAS';
"-" return 'MENOS';
"/" return 'DIV';
"^" return 'POTENCIA';
"*" return 'POR';

<<EOF>> return 'EOF';
. return 'ERROR_LEX';

/lex

/* ----- ANALIZADOR SINTÁCTICO ----- */
%start inicio

%%

inicio
    : bloque_instrucciones EOF { return $1; }
    ;

bloque_instrucciones
    : bloque_instrucciones instruccion { $1.push($2); $$ = $1; }
    | instruccion { $$ = [$1]; }
    ;

instruccion
    : regla_estilo { $$ = $1; }
    | bucle_for    { $$ = $1; }
    | error LLAVE_DER
    {
        $$ = { tipo: "ERROR", clase: "Sintáctico", lexema: yytext, linea: this._$.first_line };
    }
    | ERROR_LEX
    {
        $$ = { tipo: "ERROR", clase: "Léxico", lexema: yytext, linea: this._$.first_line };
    }
    ;

regla_estilo
    : selector LLAVE_IZQ lista_propiedades LLAVE_DER
    {
        $$ = { tipo: "REGLA", selector: $1, extiende: null, propiedades: $3, linea: this._$.first_line };
    }
    | selector LLAVE_IZQ LLAVE_DER
    {
        $$ = { tipo: "REGLA", selector: $1, extiende: null, propiedades: [], linea: this._$.first_line };
    }
    | selector R_EXTENDS selector LLAVE_IZQ lista_propiedades LLAVE_DER
    {
        $$ = { tipo: "REGLA", selector: $1, extiende: $3, propiedades: $5, linea: this._$.first_line };
    }
    | selector R_EXTENDS selector LLAVE_IZQ LLAVE_DER
    {
        $$ = { tipo: "REGLA", selector: $1, extiende: $3, propiedades: [], linea: this._$.first_line };
    }
    ;

selector
    : ID { $$ = $1; }
    | ID VARIABLE { $$ = $1 + $2; } 
    ;

bucle_for
    : R_FOR VARIABLE R_FROM NUMERO R_THROUGH NUMERO LLAVE_IZQ bloque_instrucciones LLAVE_DER
    {
        $$ = { tipo: "FOR", variable: $2, inicio: Number($4), fin: Number($6), rango: "through", instrucciones: $8, linea: this._$.first_line };
    }
    | R_FOR VARIABLE R_FROM NUMERO R_TO NUMERO LLAVE_IZQ bloque_instrucciones LLAVE_DER
    {
        $$ = { tipo: "FOR", variable: $2, inicio: Number($4), fin: Number($6), rango: "to", instrucciones: $8, linea: this._$.first_line };
    }
    ;

lista_propiedades_opt
    : lista_propiedades { $$ = $1; }
    | { $$ = []; }
    ;

lista_propiedades
    : lista_propiedades propiedad { $1.push($2); $$ = $1; }
    | propiedad { $$ = [$1]; }
    ;

propiedad
    : nombre_propiedad IGUAL lista_valores PUNTOCOMA
    {
        $$ = { nombre: $1, valores: $3, linea: this._$.first_line };
    }
    ;

nombre_propiedad
    : nombre_propiedad ID { $$ = $1 + " " + $2; }
    | ID { $$ = $1; }
    ;

lista_valores
    : lista_valores valor { $1.push($2); $$ = $1; }
    | valor { $$ = [$1]; }
    ;

valor
    : NUMERO { $$ = { tipo: "NUMERO", valor: Number($1) }; }
    | NUMERO R_PX { $$ = { tipo: "MEDIDA", valor: Number($1), unidad: "px" }; }
    | NUMERO R_PORC { $$ = { tipo: "MEDIDA", valor: Number($1), unidad: "%" }; }
    | VARIABLE { $$ = { tipo: "VARIABLE", id: $1 }; }
    | VARIABLE MAS NUMERO { $$ = { tipo: "OPERACION", izquierda: $1, operador: "+", derecha: Number($3) }; }
    | VARIABLE MENOS NUMERO { $$ = { tipo: "OPERACION", izquierda: $1, operador: "-", derecha: Number($3) }; }
    | VARIABLE POR NUMERO { $$ = { tipo: "OPERACION", izquierda: $1, operador: "*", derecha: Number($3) }; }
    | VARIABLE DIV NUMERO { $$ = { tipo: "OPERACION", izquierda: $1, operador: "/", derecha: Number($3) }; }
    | VARIABLE POTENCIA NUMERO { $$ = { tipo: "OPERACION", izquierda: $1, operador: "^", derecha: Number($3) }; }
    | ID { $$ = { tipo: "CADENA", valor: $1 }; }
    | HEX { $$ = { tipo: "HEX", valor: $1 }; }
    | ID PAR_IZQ lista_valores COMA lista_valores COMA lista_valores PAR_DER 
    { 
        $$ = { tipo: "FUNCION", nombre: $1, args: [$3, $5, $7] }; 
    }
    ;