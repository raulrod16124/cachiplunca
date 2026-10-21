import { ImageOff, LoaderCircle } from '@raulrod/icons';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { isImageElement } from '../../../domain/element';
import type { ImageElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';

type ImageLoadState = 'loading' | 'loaded' | 'error';

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.canvas.elementBorderSoft};
  background-color: ${({ theme }) => theme.color.background.sunken};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  cursor: pointer;
`;

const Img = styled.img<{ readonly $loaded: boolean }>`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: ${({ $loaded }) => ($loaded ? 1 : 0)};
  user-select: none;
`;

const StateOverlay = styled.div<{ readonly $error: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.color.background.sunken};
  color: ${({ $error, theme }) => ($error ? theme.color.text.danger : theme.color.text.muted)};
`;

const Spinner = styled(LoaderCircle)`
  animation: ${spin} 900ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

interface ImageContentProps {
  readonly element: ImageElement;
}

function ImageContent({ element }: ImageContentProps): ReactElement {
  const [loadState, setLoadState] = useState<ImageLoadState>('loading');
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setLoadState('loading');

    const image = imageRef.current;

    if (image !== null && image.complete && image.naturalWidth > 0) {
      setLoadState('loaded');
    }
  }, [element.src]);

  return (
    <Content
      data-element-content="true"
      data-element-type="image"
      data-image-src={element.src}
      data-image-state={loadState}
      aria-busy={loadState === 'loading' ? true : undefined}
    >
      <Img
        ref={imageRef}
        src={element.src}
        alt={element.alt ?? ''}
        draggable={false}
        $loaded={loadState === 'loaded'}
        data-testid={`image-content-${element.id.value}`}
        onLoad={() => setLoadState('loaded')}
        onError={() => setLoadState('error')}
      />
      {loadState === 'loaded' ? null : (
        <StateOverlay $error={loadState === 'error'} data-image-overlay="true" aria-hidden="true">
          {loadState === 'error' ? <ImageOff size={24} /> : <Spinner size={24} />}
        </StateOverlay>
      )}
    </Content>
  );
}

export function ImageRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isImageElement(element)) {
    return null;
  }

  return <ImageContent element={element} />;
}
