; --------------------------------------
;	Programa simple
; --------------------------------------
	JMP Start		; saltar a start
x:	DB  4           ; x=4
y:	DB  5           ; y=5
z:	DB  0           ; z=0

Start:
	MOV  AL, [2]	; cargo x
	ADD  AL, [3]	; x + y
	MOV [4], AL
; --------------------------------------
    END
; --------------------------------------
