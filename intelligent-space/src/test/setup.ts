import { vi } from 'vitest';
import '@testing-library/jest-dom';

// jsdom 未实现的 DOM 方法 mock
Element.prototype.scrollIntoView = vi.fn();
