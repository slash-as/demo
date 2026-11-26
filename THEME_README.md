# Tema Chiaro e Scuro per Nebula

## Descrizione
Il progetto Nebula ora supporta sia il tema scuro (default) che il tema chiaro. Gli utenti possono passare tra i due temi cliccando sul pulsante di toggle nell'header.

## Come Funziona

### 1. Struttura CSS
- **Tema Scuro (default)**: Definito nelle variabili `:root` nel file `src/styles.css`
- **Tema Chiaro**: Definito nelle variabili `:root[data-theme="light"]` nel file `src/styles.css`

### 2. Componente ThemeToggle
- File: `src/ui/theme-toggle.ts`
- Gestisce la logica per:
  - Caricare il tema salvato da localStorage
  - Cambiare tema cliccando sul pulsante
  - Aggiornare l'icona in base al tema corrente

### 3. Integrazione nell'App
- Il pulsante del tema viene aggiunto nell'header tramite la funzione `addLogoutButton()` in `src/main.ts`
- Il tema viene salvato in localStorage con la chiave `nebula:theme`

## Variabili del Tema

### Tema Scuro
```css
:root {
  --bg: #07070b;
  --surface: rgba(18, 18, 28, 0.78);
  --surface-solid: #11111a;
  --surface-2: rgba(255, 255, 255, 0.05);
  --border: rgba(255, 255, 255, 0.075);
  --border-strong: rgba(255, 255, 255, 0.14);
  --text: #f4f4f8;
  --muted: #9797ab;
  --muted-2: #6f6f83;
  --violet: #8b5cf6;
  --violet-bright: #b39cff;
  --cyan: #22d3ee;
  --pink: #f472b6;
  --green: #34d399;
  --gradient: linear-gradient(120deg, #a78bfa 0%, #8b5cf6 38%, #22d3ee 100%);
  --gradient-soft: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(34, 211, 238, 0.09));
  --shadow: 0 24px 60px -28px rgba(0, 0, 0, 0.85);
  --glow: 0 0 34px rgba(139, 92, 246, 0.4);
}
```

### Tema Chiaro
```css
:root[data-theme="light"] {
  --bg: #f8f9fa;
  --surface: rgba(255, 255, 255, 0.85);
  --surface-solid: #ffffff;
  --surface-2: rgba(0, 0, 0, 0.05);
  --border: rgba(0, 0, 0, 0.1);
  --border-strong: rgba(0, 0, 0, 0.2);
  --text: #1a1a1a;
  --muted: #6b7280;
  --muted-2: #4b5563;
  --violet: #7c3aed;
  --violet-bright: #a78bfa;
  --cyan: #06b6d4;
  --pink: #ec4899;
  --green: #10b981;
  --gradient: linear-gradient(120deg, #a78bfa 0%, #7c3aed 38%, #06b6d4 100%);
  --gradient-soft: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(6, 182, 212, 0.05));
  --shadow: 0 24px 60px -28px rgba(0, 0, 0, 0.1);
  --glow: 0 0 34px rgba(124, 58, 237, 0.2);
}
```

## Test

### File di Test
- `test-theme.html`: Pagina di test per verificare il funzionamento del tema
- Apri il file nel browser e clicca sul pulsante del tema per vedere il cambio

### Come Testare
1. Apri `test-theme.html` nel browser
2. Clicca sul pulsante del tema nell'header
3. Verifica che i colori cambiano correttamente
4. Controlla che l'icona del tema si aggiorni (sole per tema chiaro, luna per tema scuro)
5. Ricarica la pagina e verifica che il tema scelto viene mantenuto

## Implementazione

### Aggiungere il Tema a Nuovi Componenti
Quando crei nuovi componenti, usa le variabili CSS invece di valori fissi:

```css
.my-component {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}
```

### Aggiungere Nuove Variabili
Se aggiungi nuove variabili CSS, assicurati di definire sia per il tema scuro che per quello chiaro:

```css
:root {
  --my-variable: #123456;
}

:root[data-theme="light"] {
  --my-variable: #654321;
}
```

## Browser Support
- Modern browsers con supporto per CSS custom properties
- Mobile browsers (iOS Safari, Android Chrome)
- Internet Explorer non è supportato

## Performance
- Il cambio tema avviene senza ricaricare la pagina
- Le animazioni sono ottimizzate per non causare lag
- Le variabili CSS sono supportate nativamente dai browser moderni

## Note
- Il tema viene salvato in localStorage e persistente tra le sessioni
- Il tema di default è scuro
- Le icsole per il tema sono definite in `src/ui/icons.ts`