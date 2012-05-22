uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform vec2 u_repeat;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    // Fuzz Factor - Controls blurriness between light and dark colors
    const float fuzz = 0.03;
    
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    float b = mod(floor(u_repeat.s * st.s) + floor(u_repeat.t * st.t), 2.0);  // 0.0 or 1.0
    
    // Find the distance from the closest separator (region between two colors)
    float scaledWidth = fract(u_repeat.s * st.s);
    scaledWidth = abs(scaledWidth - floor(scaledWidth + 0.5));
    float scaledHeight = fract(u_repeat.t * st.t);
    scaledHeight = abs(scaledHeight - floor(scaledHeight + 0.5));
    float value = min(scaledWidth, scaledHeight);
    
    //anti-aliasing
    float val1 = clamp(value / fuzz, 0.0, 1.0);
    float val2 = clamp((value - 0.5) / fuzz, 0.0, 1.0);
    val1 = val1 * (1.0 - val2);
    val1 = val1 * val1 * (3.0 - (2.0 * val1));
    val1 = pow(val1, 0.5); //makes the transition nicer
    
    vec4 midColor = (u_lightColor + u_darkColor) / 2.0;
    vec4 currentColor = mix(u_lightColor, u_darkColor, b);
    return mix(midColor, currentColor, val1);
}
