/* ----- ANALIZADOR LÉXICO ----- */
%lex
%options case-sensitive

%%
\s+ {}
"<!--"[\s\S]*?"-->" {}
"/*"[\s\S]*?"*/" {}
"//".* {}

/* Palabras Reservadas Lógicas */
"if" return 'R_IF';
"else" return 'R_ELSE';
"true" return 'R_TRUE';
"false" return 'R_FALSE';

/* Etiquetas del sistema*/
"vista" return 'E_VISTA';
"contenedor" return 'E_CONTENEDOR';
"boton" return 'E_BOTON';

/* Tipos de Datos y Reservadas */
"int" return 'R_INT';
"float" return 'R_FLOAT';
"string" return 'R_STRING';
"boolean" return 'R_BOOLEAN';
"char" return 'R_CHAR';
"function" return 'R_FUNCTION';

/* Otras palabras reservadas */
"for" return 'R_FOR';
"each" return 'R_EACH';
"track" return 'R_TRACK';
"empty" return 'R_EMPTY';
"switch" return 'R_SWITCH';
"case" return 'R_CASE';
"default" return 'R_DEFAULT';
"IMG" return 'R_IMG';
"FORM" return 'R_FORM';
"INPUT_TEXT" return 'R_INPUT_TEXT';
"INPUT_NUMBER" return 'R_INPUT_NUMBER';
"INPUT_BOOL" return 'R_INPUT_BOOL';
"SUBMIT" return 'R_SUBMIT';
"T" return 'R_T';

/* Símbolos HTML */
"</" return 'CIERRE_ETIQUETA';
"<" return 'MENOR';
">" return 'MAYOR';
"/" return 'DIAGONAL';

/* Operadores Basicos*/
"==" return 'IGUAL_IGUAL';
"!=" return 'DIFERENTE';
"=" return 'IGUAL';
"{" return 'LLAVE_IZQ';
"}" return 'LLAVE_DER';
"(" return 'PAR_IZQ';
")" return 'PAR_DER';
"[" return 'CORCHETE_IZQ';
"]" return 'CORCHETE_DER';
"," return 'COMA';
":" return 'DOS_PUNTOS';
";" return 'PUNTOCOMA';

/* Valores Dinámicos */
"$"[a-zA-Z_][a-zA-Z0-9_]* return 'VARIABLE';
\"[^\"]*\" { yytext = yytext.slice(1, -1); return 'CADENA'; }
[0-9]+("."[0-9]+)? return 'NUMERO';
[a-zA-Z_][a-zA-Z0-9_\-]* return 'ID';

<<EOF>> return 'EOF';
. return 'ERROR_LEX';

/lex

/* ----- ANALIZADOR SINTÁCTICO ----- */
%start inicio
%define parse.error verbose

%%
inicio
    : lista_componentes EOF { return { tipo: "RAIZ_COMPONENTES", componentes: $1 }; }
    ;

lista_componentes
    : lista_componentes componente { $1.push($2); $$ = $1; }
    | componente { $$ = [$1]; }
    ;

componente
    : ID PAR_IZQ parametros_opc PAR_DER LLAVE_IZQ elementos_opc LLAVE_DER
    {
        $$ = { tipo: "COMPONENTE", nombre: $1, parametros: $3, elementos: $6, linea: this._$.first_line };
    }
    | error LLAVE_DER
    {
        $$ = { tipo: "ERROR", clase: "Sintáctico", lexema: yytext, linea: yylineno + 1 };
    }
    ;
    
parametros_opc
    : lista_parametros { $$ = $1; }
    | { $$ = []; }
    ;

lista_parametros
    : lista_parametros COMA parametro { $1.push($3); $$ = $1; }
    | parametro { $$ = [$1]; }
    ;

parametro
    : tipo_dato ID { $$ = { tipo_dato: $1, id: $2 }; }
    | tipo_dato VARIABLE { $$ = { tipo_dato: $1, id: $2 }; }
    ;

tipo_dato
    : R_INT { $$ = "int"; }
    | R_FLOAT { $$ = "float"; }
    | R_STRING { $$ = "string"; }
    | R_BOOLEAN { $$ = "boolean"; }
    | R_CHAR { $$ = "char"; }
    | R_FUNCTION { $$ = "function"; }
    ;

elementos_opc
    : elementos { $$ = $1; }
    | { $$ = []; }
    ;

elementos
    : elementos elemento { $1.push($2); $$ = $1; }
    | elemento { $$ = [$1]; }
    ;

elemento
    : etiqueta { $$ = $1; }
    | seccion { $$ = $1; }
    | imagen { $$ = $1; }
    | formulario { $$ = $1; }
    | texto_enlinea { $$ = $1; }
    | condicional { $$ = $1; }
    | ciclo_for_each { $$ = $1; }
    | switch_comp { $$ = $1; }
    | error MAYOR
    {
        $$ = { tipo: "ERROR", clase: "Sintáctico", lexema: yytext, linea: yylineno + 1 };
    }
    | error LLAVE_DER
    {
        $$ = { tipo: "ERROR", clase: "Sintáctico", lexema: yytext, linea: yylineno + 1 };
    }
    | error CORCHETE_DER
    {
        $$ = { tipo: "ERROR", clase: "Sintáctico", lexema: yytext, linea: yylineno + 1 };
    }
    | ERROR_LEX
    {
        $$ = { tipo: "ERROR", clase: "Léxico", lexema: yytext, linea: yylineno + 1 };
    }
    ;

/* ----- ETIQUETAS HTML ----- */
etiqueta
    : MENOR tipo_etiqueta lista_atributos MAYOR elementos_opc CIERRE_ETIQUETA tipo_etiqueta MAYOR
        { 
            $$ = { tipo: "ETIQUETA", nombre: $2, atributos: $3, hijos: $5, linea: this._$.first_line };
        }
    | MENOR tipo_etiqueta MAYOR elementos_opc CIERRE_ETIQUETA tipo_etiqueta MAYOR
        {
            $$ = { tipo: "ETIQUETA", nombre: $2, atributos: [], hijos: $4, linea: this._$.first_line };
        }
    | MENOR tipo_etiqueta lista_atributos DIAGONAL MAYOR
        { 
            $$ = { tipo: "ETIQUETA", nombre: $2, atributos: $3, hijos: [], linea: this._$.first_line };
        }
    | MENOR tipo_etiqueta DIAGONAL MAYOR
        {
            $$ = { tipo: "ETIQUETA", nombre: $2, atributos: [], hijos: [], linea: this._$.first_line };
        }
    ;

tipo_etiqueta
    : E_VISTA { $$ = "vista"; }
    | E_CONTENEDOR { $$ = "contenedor"; }
    | E_BOTON { $$ = "boton"; }
    ;

/* ----- ATRIBUTOS ----- */
lista_atributos
    : lista_atributos atributo { $1.push($2); $$ = $1; }
    | atributo { $$ = [$1]; }
    ;

atributo
    : ID IGUAL CADENA { $$ = { nombre: $1, valor: $3 }; }
    ;
/* ----- SECCIONES ----- */
seccion
    : CORCHETE_IZQ elementos_opc CORCHETE_DER
        {
            $$ = { tipo: "SECCION", estilos: [], hijos: $2, linea: this._$.first_line };
        }
    | MENOR lista_estilos MAYOR CORCHETE_IZQ elementos_opc CORCHETE_DER
        {
            $$ = { tipo: "SECCION", estilos: $2, hijos: $5, linea: this._$.first_line };
        }
    ;

lista_estilos
    : lista_estilos COMA ID { $1.push($3); $$ = $1; }
    | ID { $$ = [$1]; }
    ;

/* ----- IMÁGENES ----- */
imagen
    : R_IMG MENOR lista_estilos MAYOR PAR_IZQ lista_urls PAR_DER
        {
            $$ = { tipo: "IMAGEN", estilos: $3, urls: $6, linea: this._$.first_line };
        }
    | R_IMG MENOR MAYOR PAR_IZQ lista_urls PAR_DER
        {
            $$ = { tipo: "IMAGEN", estilos: [], urls: $5, linea: this._$.first_line };
        }
    ;

lista_urls
    : lista_urls COMA url { $1.push($3); $$ = $1; }
    | url { $$ = [$1]; }
    ;

url
    : CADENA { $$ = $1; }
    | VARIABLE { $$ = { tipo: "VARIABLE", id: $1 }; }
    ;

/* ----- FORMULARIOS ----- */
formulario
    : R_FORM MENOR lista_estilos MAYOR LLAVE_IZQ elementos_form LLAVE_DER submit_opcional
    {
        $$ = { tipo: "FORMULARIO", estilos: $3, elementos: $6, submit: $8, linea: this._$.first_line };
    }
    | R_FORM MENOR MAYOR LLAVE_IZQ elementos_form LLAVE_DER submit_opcional
    {
        $$ = { tipo: "FORMULARIO", estilos: [], elementos: $5, submit: $7, linea: this._$.first_line };
    }
    ;

elementos_form
    : elementos_form elemento_form { $1.push($2); $$ = $1; }
    | elemento_form { $$ = [$1]; }
    ;

elemento_form
    : input_text { $$ = $1; }
    | input_number { $$ = $1; }
    | input_bool { $$ = $1; }
    | etiqueta { $$ = $1; }
    | seccion { $$ = $1; }
    | imagen { $$ = $1; }
    | texto_enlinea { $$ = $1; }
    | condicional { $$ = $1; }
    | ciclo_for_each { $$ = $1; }
    | switch_comp { $$ = $1; }
    ;

submit_opcional
    : R_SUBMIT MENOR lista_estilos MAYOR LLAVE_IZQ atributos_submit LLAVE_DER
    {
        $$ = { tipo: "SUBMIT", estilos: $3, atributos: $6, linea: this._$.first_line };
    }
    | R_SUBMIT MENOR MAYOR LLAVE_IZQ atributos_submit LLAVE_DER
    {
        $$ = { tipo: "SUBMIT", estilos: [], atributos: $5, linea: this._$.first_line };
    }
    | { $$ = null; }
    ;

atributos_submit
    : atributos_submit COMA attr_submit { $1.push($3); $$ = $1; }
    | attr_submit { $$ = [$1]; }
    ;

attr_submit
    : ID DOS_PUNTOS CADENA 
    { $$ = { nombre: $1, valor: $3 }; }
    | R_FUNCTION DOS_PUNTOS CADENA 
    { $$ = { nombre: "function", valor: $3 }; }
    ;

input_text
    : R_INPUT_TEXT MENOR lista_estilos MAYOR PAR_IZQ lista_attr_input PAR_DER
    {
        $$ = { tipo: "INPUT", subtipo: "text", estilos: $3, atributos: $6, linea: this._$.first_line };
    }
    | R_INPUT_TEXT MENOR MAYOR PAR_IZQ lista_attr_input PAR_DER
    {
        $$ = { tipo: "INPUT", subtipo: "text", estilos: [], atributos: $5, linea: this._$.first_line };
    }
    ;

input_number
    : R_INPUT_NUMBER MENOR lista_estilos MAYOR PAR_IZQ lista_attr_input PAR_DER
    {
        $$ = { tipo: "INPUT", subtipo: "number", estilos: $3, atributos: $6, linea: this._$.first_line };
    }
    | R_INPUT_NUMBER MENOR MAYOR PAR_IZQ lista_attr_input PAR_DER
    {
        $$ = { tipo: "INPUT", subtipo: "number", estilos: [], atributos: $5, linea: this._$.first_line };
    }
    ;

input_bool
    : R_INPUT_BOOL MENOR lista_estilos MAYOR PAR_IZQ lista_attr_input PAR_DER
    {
        $$ = { tipo: "INPUT", subtipo: "bool", estilos: $3, atributos: $6, linea: this._$.first_line };
    }
    | R_INPUT_BOOL MENOR MAYOR PAR_IZQ lista_attr_input PAR_DER
    {
        $$ = { tipo: "INPUT", subtipo: "bool", estilos: [], atributos: $5, linea: this._$.first_line };
    }
    ;

lista_attr_input
    : lista_attr_input COMA attr_input { $1.push($3); $$ = $1; }
    | attr_input { $$ = [$1]; }
    ; 

attr_input
    : ID DOS_PUNTOS valor_input { $$ = { nombre: $1, valor: $3 }; }
    ;

valor_input
    : CADENA { $$ = $1; }
    | VARIABLE { $$ = { tipo: "VARIABLE", id: $1 }; }
    | NUMERO { $$ = Number($1); }
    | R_TRUE { $$ = true; }
    | R_FALSE { $$ = false; }
    ;

/* ----- TEXTO EN LÍNEA ----- */
texto_enlinea
    : R_T PAR_IZQ CADENA PAR_DER
    {
        $$ = { tipo: "TEXTO", valor: $3, linea: this._$.first_line };
    }
    ;

/* ----- CICLO FOR EACH ----- */
ciclo_for_each
    : R_FOR R_EACH PAR_IZQ lista_pares PAR_DER LLAVE_IZQ elementos_opc LLAVE_DER empty_opcional
    {
        $$ = { tipo: "FOR_EACH", pares: $4, track_index: null, instrucciones: $7, vacio: $9, linea: this._$.first_line };
    }
    | R_FOR PAR_IZQ lista_pares PAR_DER R_TRACK VARIABLE LLAVE_IZQ elementos_opc LLAVE_DER empty_opcional
    {
        $$ = { tipo: "FOR_EACH", pares: $3, track_index: $6, instrucciones: $8, vacio: $10, linea: this._$.first_line };
    }
    ;

lista_pares
    : lista_pares COMA par { $1.push($3); $$ = $1; }
    | par { $$ = [$1]; }
    ;

par
    : VARIABLE DOS_PUNTOS VARIABLE
    {
        $$ = { variable_array: $1, variable_acceso: $3 };
    }
    ;

empty_opcional
    : R_EMPTY LLAVE_IZQ elementos_opc LLAVE_DER { $$ = $3; }
    | { $$ = null; }
    ;

/* ----- SWITCH CASE ----- */
switch_comp
    : R_SWITCH PAR_IZQ valor PAR_DER LLAVE_IZQ lista_casos default_opcional LLAVE_DER
    {
        $$ = { tipo: "SWITCH", expresion: $3, casos: $6, default: $7, linea: this._$.first_line };
    }
    ;

lista_casos
    : lista_casos COMA caso { $1.push($3); $$ = $1; }
    | caso { $$ = [$1]; }
    ;

caso
    : R_CASE valor DOS_PUNTOS LLAVE_IZQ elementos_opc LLAVE_DER
    {
        $$ = { valor: $2, instrucciones: $5 };
    }
    ;

default_opcional
    : COMA R_DEFAULT DOS_PUNTOS LLAVE_IZQ elementos_opc LLAVE_DER { $$ = $5; }
    | { $$ = null; }
    ;

/* ----- CONDICIONAL IF ----- */
condicional
    : R_IF PAR_IZQ condicion PAR_DER LLAVE_IZQ elementos_opc LLAVE_DER
    {
        $$ = { tipo: "IF", condicion: $3, inst_true: $6, lista_elseif: [], inst_false: null, linea: this._$.first_line };
    }
    | R_IF PAR_IZQ condicion PAR_DER LLAVE_IZQ elementos_opc LLAVE_DER R_ELSE LLAVE_IZQ elementos_opc LLAVE_DER
    {
        $$ = { tipo: "IF", condicion: $3, inst_true: $6, lista_elseif: [], inst_false: $10, linea: this._$.first_line };
    }
    | R_IF PAR_IZQ condicion PAR_DER LLAVE_IZQ elementos_opc LLAVE_DER lista_else_if
    {
        $$ = { tipo: "IF", condicion: $3, inst_true: $6, lista_elseif: $8, inst_false: null, linea: this._$.first_line };
    }
    | R_IF PAR_IZQ condicion PAR_DER LLAVE_IZQ elementos_opc LLAVE_DER lista_else_if R_ELSE LLAVE_IZQ elementos_opc LLAVE_DER
    {
        $$ = { tipo: "IF", condicion: $3, inst_true: $6, lista_elseif: $8, inst_false: $11, linea: this._$.first_line };
    }
    ;

lista_else_if
    : lista_else_if R_ELSE R_IF PAR_IZQ condicion PAR_DER LLAVE_IZQ elementos_opc LLAVE_DER
    {
        $1.push({ condicion: $5, instrucciones: $8 }); $$ = $1;
    }
    | R_ELSE R_IF PAR_IZQ condicion PAR_DER LLAVE_IZQ elementos_opc LLAVE_DER
    {
        $$ = [{ condicion: $4, instrucciones: $7 }];
    }
    ;

condicion
    : valor IGUAL_IGUAL valor { $$ = { izq: $1, operador: "==", der: $3 }; }
    | valor DIFERENTE valor { $$ = { izq: $1, operador: "!=", der: $3 }; }
    | R_TRUE { $$ = { valor: true }; }
    | R_FALSE { $$ = { valor: false }; }
    ;

valor
    : NUMERO { $$ = Number($1); }
    | CADENA { $$ = $1; }
    | VARIABLE { $$ = { tipo: "VARIABLE", id: $1 }; }
    ;