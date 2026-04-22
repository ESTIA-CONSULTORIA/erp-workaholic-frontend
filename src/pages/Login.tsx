const LOGIN_BG = '/login-bg.webp';

<div
  style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#050608',
    padding: 16,
  }}
>
  <div
    style={{
      position: 'relative',
      width: 'min(96vw, 1400px)',
      aspectRatio: '1906 / 1025',
      backgroundImage: `url(${LOGIN_BG})`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    }}
  >
    <form onSubmit={handleLogin} style={{ position: 'absolute', inset: 0 }}>

      {/* USER */}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          position: 'absolute',
          top: '52%',
          left: '26%',
          width: '52%',
          height: '5%',
          background: 'transparent',
          border: 'none',
          color: 'white',
        }}
      />

      {/* PASSWORD */}
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          position: 'absolute',
          top: '64%',
          left: '26%',
          width: '52%',
          height: '5%',
          background: 'transparent',
          border: 'none',
          color: 'white',
        }}
      />

      {/* LOGIN BUTTON */}
      <button
        type="submit"
        style={{
          position: 'absolute',
          top: '79%',
          left: '31%',
          width: '38%',
          height: '7%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      />

    </form>
  </div>
</div>
