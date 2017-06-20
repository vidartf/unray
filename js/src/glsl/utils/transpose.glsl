// Replacement for transpose function in webgl2

mat2 transpose(mat2 A)
{
    return mat2(A[0][0], A[1][0],
                A[0][1], A[1][1]);
}

mat3 transpose(mat3 A)
{
    return mat3(A[0][0], A[1][0], A[2][0],
                A[0][1], A[1][1], A[2][1],
                A[0][2], A[1][2], A[2][2]);
}

mat4 transpose(mat4 A)
{
    return mat4(A[0][0], A[1][0], A[2][0], A[3][0],
                A[0][1], A[1][1], A[2][1], A[3][1],
                A[0][2], A[1][2], A[2][2], A[3][2],
                A[0][3], A[1][3], A[2][3], A[3][3]);
}
