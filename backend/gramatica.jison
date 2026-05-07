/* ----- ANALIZADOR LÉXICO ----- */
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
\"[^\"]*\" { yytext = yytext.slice(1, -1); return 'CADENA'; }

"[" return 'CORCHETE_IZQ';
"]" return 'CORCHETE_DER';
"=" return 'IGUAL';
"," return 'COMA';
";" return 'PUNTOCOMA';
"." return 'PUNTO';

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
    | insertar_reg PUNTOCOMA { $$ = $1; }
    | actualizar_reg PUNTOCOMA { $$ = $1; }
    | eliminar_reg PUNTOCOMA { $$ = $1; }
    | seleccionar_col PUNTOCOMA { $$ = $1; }
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

lista_columnas
    : lista_columnas COMA columna { $$ = $1; $$.push($3); }
    | columna { $$ = [$1]; }
    ;

columna
    : ID ID { $$ = { id: $1, tipo_dato: $2 }; }
    | ID IGUAL ID { $$ = { id: $1, tipo_dato: $3 }; }
    ;

insertar_reg
    : ID CORCHETE_IZQ lista_asignaciones CORCHETE_DER
    {
        $$ = { tipo: "INSERTAR", tabla: $1, valores: $3, linea: this._$.first_line };
    }
    ;

actualizar_reg
    : ID CORCHETE_IZQ lista_asignaciones CORCHETE_DER RW_IN NUMERO
    {
        $$ = { tipo: "ACTUALIZAR", tabla: $1, valores: $3, idCond: Number($6), linea: this._$.first_line };
    }
    ;

eliminar_reg
    : ID RW_DELETE NUMERO
    {
        $$ = { tipo: "ELIMINAR", tabla: $1, idCond: Number($3), linea: this._$.first_line };
    }
    ;

seleccionar_col
    : ID PUNTO ID
    {
        $$ = { tipo: "SELECCIONAR", tabla: $1, columna: $3, linea: this._$.first_line };
    }
    ;

lista_asignaciones
    : lista_asignaciones COMA asignacion { $$ = $1; Object.assign($$, $3); }
    | asignacion { $$ = $1; }
    ;

asignacion
    : ID IGUAL NUMERO { $$ = {}; $$[$1] = Number($3); }
    | ID IGUAL CADENA { $$ = {}; $$[$1] = $3; }
    ;