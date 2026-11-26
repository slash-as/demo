import { icon } from './icons';

export class ThemeToggle {
  private button: HTMLButtonElement;
  private sunIcon: string;
  private moonIcon: string;
  private isDark: boolean;

  constructor() {
    this.sunIcon = icon('sun', 20);
    this.moonIcon = icon('moon', 20);
    this.isDark = true;
    this.button = document.createElement('button');
    this.button.className = 'theme-toggle';
    this.button.innerHTML = this.sunIcon;
    this.button.setAttribute('aria-label', 'Toggle theme');
    this.button.addEventListener('click', () => this.toggle());
    this.loadTheme();
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem('nebula:theme');
    if (savedTheme === 'light') {
      this.setLightTheme();
    } else {
      this.setDarkTheme();
    }
  }

  private toggle(): void {
    if (this.isDark) {
      this.setLightTheme();
    } else {
      this.setDarkTheme();
    }
  }

  private setDarkTheme(): void {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('nebula:theme', 'dark');
    this.button.innerHTML = this.sunIcon;
    this.isDark = true;
  }

  private setLightTheme(): void {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('nebula:theme', 'light');
    this.button.innerHTML = this.moonIcon;
    this.isDark = false;
  }

  public render(): HTMLButtonElement {
    return this.button;
  }
}