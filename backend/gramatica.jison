/* ----- ANALIZADOR LÉXIcO ----- */
%lex
%options case-insensitive

%%
\s+ {}
\/\*[\s\S]*?\*\/ {}
"TABLE" return 'RW_TABLE';
"COLUMNS" return 'RW_COLUMNS';
"DELETE" return 'RW_DELETE';
"IN" return 'RW_IN';
[a-zA-Z_][a-zA-Z0-9_]* return 'ID';
[0-9]+("."[0-9]+)? return 'NUMERO';
"[" return 'CORCHETE_IZQ';
"]" return 'CORCHETE_DER';
"=" return 'IGUAL';
"," return 'COMA';
";" return 'PUNTOCOMA';
<<EOF>> return 'EOF';
. return 'ERROR_LEX';


/lex

/* ----- ANALIZADOR SINTÁCTICO ----- */
%start inicio

%%
inicio
    : instrucciones EOF { return $1; }
    ;

instrucciones 
    : instrucciones instruccion { $$ = $1; $$.push($2); }
    | instruccion { $$ = [$1]; }
    ;

instruccion 
    : crear_tabla PUNTOCOMA { $$ = $1; }
    | eliminar_reg PUNTOCOMA { $$ = $1; }
    | error PUNTOCOMA
    {
        $$ = { tipo: "ERROR", clase: "Sintáctico", lexema: yytext, linea: this._$.first_line };
    }
    | ERROR_LEX
    {
        $$ = { tipo: "ERROR", clase: "Léxico", lexema: yytext, linea: this._$.first_line };
    }
    ;

crear_tabla
    : RW_TABLE ID RW_COLUMNS lista_columnas
    {
        $$ = { tipo: "CREAR_TABLA", tabla: $2, columnas: $4, linea: this._$.first_line };
    }
    ;

eliminar_reg
    : ID RW_DELETE NUMERO
    {
        $$ = { tipo: "ELIMINAR", tabla: $1, id_registro: Number($3), linea: this._$.first_line };
    }
    ;

lista_columnas
    : lista_columnas COMA columna { $$ = $1; $$.push($3); }
    | columna { $$ = [$1]; }
    ;

columna
    : ID ID { $$ = { id: $1, tipo_dato: $2 }; }
    ;