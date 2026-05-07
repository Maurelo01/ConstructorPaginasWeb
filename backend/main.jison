/* ----- ANALIZADOR LÉXICO ----- */
%lex
%options case-sensitive

%%

\s+ {}
"/*"[\s\S]*?"*/" {}
"#".* {}

/* Tipos de Datos y Reservadas */
"import" return 'R_IMPORT';
"int" return 'R_INT';
"float" return 'R_FLOAT';
"string" return 'R_STRING';
"boolean" return 'R_BOOLEAN';
"char" return 'R_CHAR';
"True" return 'R_TRUE';
"False" return 'R_FALSE';

/* Funciones y DB */
"function" return 'R_FUNCTION';
"execute" return 'R_EXECUTE';
"load" return 'R_LOAD';
"IN" return 'R_IN';
"main" return 'R_MAIN';

/* Estructuras de Control */
"if" return 'R_IF';
"else" return 'R_ELSE';
"switch" return 'R_SWITCH';
"case" return 'R_CASE';
"default" return 'R_DEFAULT';
"while" return 'R_WHILE';
"do" return 'R_DO';
"for" return 'R_FOR';
"break" return 'R_BREAK';
"continue" return 'R_CONTINUE';

/* Símbolos Puntuación */
";" return 'PUNTOCOMA';
"," return 'COMA';
":" return 'DOS_PUNTOS';
"{" return 'LLAVE_IZQ';
"}" return 'LLAVE_DER';
"(" return 'PAR_IZQ';
")" return 'PAR_DER';
"[" return 'CORCHETE_IZQ';
"]" return 'CORCHETE_DER';
"@" return 'ARROBA';
"`" return 'BACKTICK';

/* Operadores Lógicos y Relacionales */
"==" return 'IGUAL_IGUAL';
"!=" return 'DIFERENTE';
"<=" return 'MENOR_IGUAL';
">=" return 'MAYOR_IGUAL';
"<" return 'MENOR';
">" return 'MAYOR';
"&&" return 'AND';
"||" return 'OR';
"!" return 'NOT';
"=" return 'IGUAL';

/* Operadores Aritméticos y de Incremento */
"++" return 'INCREMENTO';
"--" return 'DECREMENTO';
"+" return 'MAS';
"-" return 'MENOS';
"*" return 'POR';
"/" return 'DIV';
"%" return 'MODULO';
"++" return 'INCREMENTO';
"--" return 'DECREMENTO';

/* Variables Dinámicas con $ */
"$"[a-zA-Z_][a-zA-Z0-9_]* return 'VAR_DINAMICA';

/* Literales */
\"[^\"]*\" { yytext = yytext.slice(1, -1); return 'CADENA'; }
\'[^\']\' { yytext = yytext.slice(1, -1); return 'CARACTER'; }
[0-9]+("."[0-9]+)? return 'NUMERO';
[a-zA-Z_][a-zA-Z0-9_\-]* return 'ID';

<<EOF>> return 'EOF';
. return 'ERROR_LEX';

/lex

/* ----- PRECEDENCIA DE OPERADORES ----- */
%nonassoc SIN_ELSE
%nonassoc R_ELSE
%left OR
%left AND
%right NOT
%left IGUAL_IGUAL DIFERENTE MENOR MENOR_IGUAL MAYOR MAYOR_IGUAL
%left MAS MENOS
%left POR DIV MODULO
%right UMENOS
%left INCREMENTO DECREMENTO


%start inicio

%%

/* ----- ESTRUCTURA PRINCIPAL ----- */
inicio
    : lista_imports_opc bloque_global_opc main_bloque EOF
    {
        return { tipo: "RAIZ", imports: $1, globales: $2, main: $3 };
    }
    ;

lista_imports_opc
    : lista_imports { $$ = $1; }
    | { $$ = []; }
    ;

lista_imports
    : lista_imports R_IMPORT CADENA PUNTOCOMA { $1.push($3); $$ = $1; }
    | R_IMPORT CADENA PUNTOCOMA { $$ = [$2]; }
    ;

bloque_global_opc
    : lista_globales { $$ = $1; }
    | { $$ = []; }
    ;

lista_globales
    : lista_globales declaracion_global { $1.push($2); $$ = $1; }
    | declaracion_global { $$ = [$1]; }
    ;

declaracion_global
    : declaracion_var PUNTOCOMA { $$ = $1; }
    | declaracion_func { $$ = $1; }
    ;

/* ----- VARIABLES Y ARREGLOS ----- */
tipo_dato
    : R_INT { $$ = "int"; }
    | R_FLOAT { $$ = "float"; }
    | R_STRING { $$ = "string"; }
    | R_BOOLEAN { $$ = "boolean"; }
    | R_CHAR { $$ = "char"; }
    ;

declaracion_var
    : tipo_dato ID IGUAL expresion 
    {
        $$ = { tipo: "DECLARACION", tipo_dato: $1, id: $2, valor: $4 };
    }
    | tipo_dato CORCHETE_IZQ CORCHETE_DER ID IGUAL CORCHETE_IZQ NUMERO CORCHETE_DER
    { 
        $$ = { tipo: "DECLARACION_ARR", tipo_dato: $1, id: $4, size: Number($7), valores: [] };
    }
    | tipo_dato CORCHETE_IZQ CORCHETE_DER ID IGUAL LLAVE_IZQ lista_expresiones LLAVE_DER
    { 
        $$ = { tipo: "DECLARACION_ARR", tipo_dato: $1, id: $4, size: $7.length, valores: $7 };
    }
    | tipo_dato CORCHETE_IZQ CORCHETE_DER ID IGUAL R_EXECUTE BACKTICK ID PUNTO ID BACKTICK
    {
        $$ = { tipo: "DECLARACION_ARR_DB", tipo_dato: $1, id: $4, tabla: $8, columna: $10 };
    }
    ;

/* ----- FUNCIONES Y LÓGICA DE BD ----- */
declaracion_func
    : R_FUNCTION ID PAR_IZQ lista_params_opc PAR_DER LLAVE_IZQ inst_func_opc LLAVE_DER
    {
        $$ = { tipo: "FUNCION", id: $2, parametros: $4, instrucciones: $7 };
    }
    ;

lista_params_opc
    : lista_params { $$ = $1; }
    | { $$ = []; }
    ;

lista_params
    : lista_params COMA tipo_dato ID { $1.push({ tipo_dato: $3, id: $4 }); $$ = $1; }
    | tipo_dato ID { $$ = [{ tipo_dato: $1, id: $2 }]; }
    ;

inst_func_opc
    : lista_inst_func { $$ = $1; }
    | { $$ = []; }
    ;

lista_inst_func
    : lista_inst_func inst_func { $1.push($2); $$ = $1; }
    | inst_func { $$ = [$1]; }
    ;

inst_func
    : R_EXECUTE ID CORCHETE_IZQ lista_asignaciones_db CORCHETE_DER R_IN expresion PUNTOCOMA
    {
        $$ = { tipo: "EXECUTE_DB", tabla: $2, asignaciones: $4, condicion_id: $7 };
    }
    | R_LOAD expresion PUNTOCOMA
    { 
        $$ = { tipo: "LOAD", ruta: $2 };
    }
    ;

lista_asignaciones_db
    : lista_asignaciones_db COMA ID IGUAL expresion { $1.push({ columna: $3, valor: $5 }); $$ = $1; }
    | ID IGUAL expresion { $$ = [{ columna: $1, valor: $3 }]; }
    ;

/* ----- BLOQUE MAIN ----- */
main_bloque
    : R_MAIN LLAVE_IZQ inst_main_opc LLAVE_DER
    { $$ = { tipo: "MAIN", instrucciones: $3 }; }
    ;

inst_main_opc
    : lista_inst_main { $$ = $1; }
    | { $$ = []; }
    ;

lista_inst_main
    : lista_inst_main inst_main { $1.push($2); $$ = $1; }
    | inst_main { $$ = [$1]; }
    ;

/* ----- INSTRUCCIONES DEL MAIN ----- */
inst_main
    : declaracion_var PUNTOCOMA { $$ = $1; }
    | asignacion_simple PUNTOCOMA { $$ = $1; }
    | ARROBA ID PAR_IZQ lista_expresiones_opc PAR_DER PUNTOCOMA 
    { $$ = { tipo: "INVOCAR_COMP", id: $2, argumentos: $4 }; }
    | condicional_if { $$ = $1; }
    | ciclo_while { $$ = $1; }
    | ciclo_do_while { $$ = $1; }
    | ciclo_for { $$ = $1; }
    | sentencia_switch { $$ = $1; }
    | R_BREAK PUNTOCOMA { $$ = { tipo: "BREAK" }; }
    | R_CONTINUE PUNTOCOMA { $$ = { tipo: "CONTINUE" }; }
    | error PUNTOCOMA
    {
        $$ = { tipo: "ERROR_INST", lexema: yytext, linea: this._$.first_line };
    }
    ;

asignacion_simple
    : ID IGUAL expresion
    {
        $$ = { tipo: "ASIGNACION", id: $1, valor: $3 };
    }
    | VAR_DINAMICA IGUAL expresion
    {
        $$ = { tipo: "ASIGNACION", id: $1, valor: $3 };
    }
    | ID CORCHETE_IZQ expresion CORCHETE_DER IGUAL expresion
    {
        $$ = { tipo: "ASIGNACION_ARRAY", id: $1, indice: $3, valor: $6 };
    }
    | ID INCREMENTO
    {
        $$ = { tipo: "POST_INCREMENTO", id: $1, es_variable: false };
    }
    | ID DECREMENTO
    {
        $$ = { tipo: "POST_DECREMENTO", id: $1, es_variable: false };
    }
    | VAR_DINAMICA INCREMENTO
    {
        $$ = { tipo: "POST_INCREMENTO", id: $1, es_variable: true };
    }
    | VAR_DINAMICA DECREMENTO
    {
        $$ = { tipo: "POST_DECREMENTO", id: $1, es_variable: true };
    }
    ;

/* --- ESTRUCTURAS DE CONTROL --- */

condicional_if
    : R_IF PAR_IZQ expresion PAR_DER LLAVE_IZQ inst_main_opc LLAVE_DER %prec SIN_ELSE
    { $$ = { tipo: "IF", condicion: $3, inst_true: $6, lista_elseif: [], inst_false: null }; }
    | R_IF PAR_IZQ expresion PAR_DER LLAVE_IZQ inst_main_opc LLAVE_DER R_ELSE LLAVE_IZQ inst_main_opc LLAVE_DER
    { $$ = { tipo: "IF", condicion: $3, inst_true: $6, lista_elseif: [], inst_false: $10 }; }
    | R_IF PAR_IZQ expresion PAR_DER LLAVE_IZQ inst_main_opc LLAVE_DER lista_else_if %prec SIN_ELSE
    { $$ = { tipo: "IF", condicion: $3, inst_true: $6, lista_elseif: $8, inst_false: null }; }
    | R_IF PAR_IZQ expresion PAR_DER LLAVE_IZQ inst_main_opc LLAVE_DER lista_else_if R_ELSE LLAVE_IZQ inst_main_opc LLAVE_DER
    { $$ = { tipo: "IF", condicion: $3, inst_true: $6, lista_elseif: $8, inst_false: $11 }; }
    ;

lista_else_if
    : lista_else_if R_ELSE R_IF PAR_IZQ expresion PAR_DER LLAVE_IZQ inst_main_opc LLAVE_DER
    { $1.push({ condicion: $5, instrucciones: $8 }); $$ = $1; }
    | R_ELSE R_IF PAR_IZQ expresion PAR_DER LLAVE_IZQ inst_main_opc LLAVE_DER
    { $$ = [{ condicion: $4, instrucciones: $7 }]; }
    ;

ciclo_while
    : R_WHILE PAR_IZQ expresion PAR_DER LLAVE_IZQ inst_main_opc LLAVE_DER
    { $$ = { tipo: "WHILE", condicion: $3, instrucciones: $6 }; }
    ;

ciclo_do_while
    : R_DO LLAVE_IZQ inst_main_opc LLAVE_DER R_WHILE PAR_IZQ expresion PAR_DER PUNTOCOMA
    { $$ = { tipo: "DO_WHILE", instrucciones: $3, condicion: $7 }; }
    ;

init_for
    : declaracion_var { $$ = $1; }
    | asignacion_simple { $$ = $1; }
    ;

ciclo_for
    : R_FOR PAR_IZQ init_for PUNTOCOMA expresion PUNTOCOMA asignacion_simple PAR_DER LLAVE_IZQ inst_main_opc LLAVE_DER
    { $$ = { tipo: "FOR", inicializacion: $3, condicion: $5, actualizacion: $7, instrucciones: $10 }; }
    ;

sentencia_switch
    : R_SWITCH PAR_IZQ expresion PAR_DER LLAVE_IZQ casos_switch_opc default_switch_opc LLAVE_DER
    { $$ = { tipo: "SWITCH", expresion: $3, casos: $6, default: $7 }; }
    ;

casos_switch_opc
    : lista_casos { $$ = $1; }
    | { $$ = []; }
    ;

lista_casos
    : lista_casos caso_switch { $1.push($2); $$ = $1; }
    | caso_switch { $$ = [$1]; }
    ;

caso_switch
    : R_CASE expresion DOS_PUNTOS inst_main_opc
    { $$ = { valor: $2, instrucciones: $4 }; }
    ;

default_switch_opc
    : R_DEFAULT DOS_PUNTOS inst_main_opc { $$ = $3; }
    | { $$ = null; }
    ;

/* ----- EXPRESIONES ----- */
lista_expresiones_opc
    : lista_expresiones { $$ = $1; }
    | { $$ = []; }
    ;

lista_expresiones
    : lista_expresiones COMA expresion { $1.push($3); $$ = $1; }
    | expresion { $$ = [$1]; }
    ;

expresion
    : MENOS expresion %prec UMENOS { $$ = { tipo: "UNARIO", operador: "-", valor: $2 }; }
    | expresion MAS expresion { $$ = { tipo: "OPERACION", izq: $1, operador: "+", der: $3 }; }
    | expresion MENOS expresion { $$ = { tipo: "OPERACION", izq: $1, operador: "-", der: $3 }; }
    | expresion POR expresion { $$ = { tipo: "OPERACION", izq: $1, operador: "*", der: $3 }; }
    | expresion DIV expresion { $$ = { tipo: "OPERACION", izq: $1, operador: "/", der: $3 }; }
    | expresion MODULO expresion { $$ = { tipo: "OPERACION", izq: $1, operador: "%", der: $3 }; }
    | expresion IGUAL_IGUAL expresion { $$ = { tipo: "OPERACION", izq: $1, operador: "==", der: $3 }; }
    | expresion DIFERENTE expresion { $$ = { tipo: "OPERACION", izq: $1, operador: "!=", der: $3 }; }
    | expresion MENOR expresion { $$ = { tipo: "OPERACION", izq: $1, operador: "<", der: $3 }; }
    | expresion MAYOR expresion { $$ = { tipo: "OPERACION", izq: $1, operador: ">", der: $3 }; }
    | expresion MENOR_IGUAL expresion { $$ = { tipo: "OPERACION", izq: $1, operador: "<=", der: $3 }; }
    | expresion MAYOR_IGUAL expresion { $$ = { tipo: "OPERACION", izq: $1, operador: ">=", der: $3 }; }
    | expresion AND expresion { $$ = { tipo: "OPERACION", izq: $1, operador: "&&", der: $3 }; }
    | expresion OR expresion { $$ = { tipo: "OPERACION", izq: $1, operador: "||", der: $3 }; }
    | NOT expresion { $$ = { tipo: "UNARIO", operador: "!", valor: $2 }; }
    | PAR_IZQ expresion PAR_DER { $$ = $2; }
    | ID CORCHETE_IZQ expresion CORCHETE_DER
    { $$ = { tipo: "ACCESO_ARR", id: $1, indice: $3, es_variable: false }; }
    | VAR_DINAMICA CORCHETE_IZQ expresion CORCHETE_DER
    { $$ = { tipo: "ACCESO_ARR", id: $1, indice: $3, es_variable: true }; }
    | NUMERO { $$ = Number($1); }
    | CADENA { $$ = $1; }
    | CARACTER { $$ = $1; }
    | R_TRUE { $$ = true; }
    | R_FALSE { $$ = false; }
    | ID { $$ = { tipo: "VARIABLE", id: $1 }; }
    | VAR_DINAMICA { $$ = { tipo: "VAR_DINAMICA", id: $1 }; }
    ;