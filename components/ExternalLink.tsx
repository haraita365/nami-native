import { Link, type ExternalPathString } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

type ExternalLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

export function ExternalLink({ href, ...rest }: ExternalLinkProps) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href as ExternalPathString}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          e.preventDefault();
          WebBrowser.openBrowserAsync(href);
        }
      }}
    />
  );
}
