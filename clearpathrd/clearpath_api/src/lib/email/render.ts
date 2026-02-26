/**
 * Email Template Renderer
 *
 * Renders React email templates to HTML strings.
 */

import { render } from '@react-email/render';
import type { ReactElement } from 'react';

/**
 * Render email template to HTML
 *
 * @param template React email component
 * @returns HTML string
 */
export async function renderEmailTemplate(
  template: ReactElement
): Promise<string> {
  return render(template);
}
