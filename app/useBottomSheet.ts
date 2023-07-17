import { useRef, useEffect } from 'react';
import { MIN_Y, MAX_Y } from './BottomSheetOption';

interface BottomSheetMetrics {
  touchStart: {
    sheetY: number;
    touchY: number;
  };
  touchMove: {
    prevTouchY?: number;
    movingDirection: 'none' | 'down' | 'up';
  };
  isContentAreaTouched: boolean;
}

export default function useBottomSheet() {
  const sheet = useRef<HTMLDivElement>(null);

  const content = useRef<HTMLDivElement>(null);

  const metrics = useRef<BottomSheetMetrics>({
    // 터치 시작 지점:
    touchStart: {
      sheetY: 0,
      touchY: 0,
    },
    // 터치 이동 지점 및 방향:
    touchMove: {
      prevTouchY: 0,
      movingDirection: 'none',
    },
    // 터치 시작 지점이 content영역인지 아닌지:
    isContentAreaTouched: false,
  });

  useEffect(() => {
    const canUserMoveBottomSheet = () => {
      const { touchMove, isContentAreaTouched } = metrics.current;

      // 바텀시트의 content영역이 아닌 부분을 터치하면 바텀시트를 움직일 수 있음:
      if (!isContentAreaTouched) {
        return true;
      }

      // 바텀시트가 최대로 올라와 있지 않다면, 바텀시트를 움직일 수 있음:
      if (sheet.current!.getBoundingClientRect().y !== MIN_Y) {
        return true;
      }

      // 아래로 스크롤했는데 더이상 내용이 없다면, 바텀시트를 움직일 수 있음:
      if (touchMove.movingDirection === 'down') {
        return content.current!.scrollTop <= 0;
      }

      // 그 외에는 바텀시트를 움직일 수 없음:
      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const { touchStart } = metrics.current;
      // 현재 바텀시트의 최상단 모서리의 Y좌표:
      touchStart.sheetY = sheet.current!.getBoundingClientRect().y;
      // 터치 위치의 Y좌표:
      touchStart.touchY = e.touches[0].clientY;
    };

    // 드래그 방향 지정 & 바텀시트 움직이기:
    const handleTouchMove = (e: TouchEvent) => {
      const { touchStart, touchMove } = metrics.current;
      const currentTouch = e.touches[0];

      // prevToouchY의 값이 없다면, 터치를 처음 시작했을 때의 y좌표를 저장:
      if (touchMove.prevTouchY === undefined) {
        touchMove.prevTouchY = touchStart.touchY;
      }

      // 맨 처음 앱을 시작했을 때:
      if (touchMove.prevTouchY === 0) {
        touchMove.prevTouchY = touchStart.touchY;
      }

      // 드래그한 현재 위치가 이전 위치보다 아래에 있다면, movingDirection을 down으로 변경:
      if (touchMove.prevTouchY < currentTouch.clientY) {
        touchMove.movingDirection = 'down';
      }

      // 드래그한 현재 위치가 이전 위치보다 위에 있다면, movingDirection을 up으로 변경:
      if (touchMove.prevTouchY > currentTouch.clientY) {
        touchMove.movingDirection = 'up';
      }

      if (canUserMoveBottomSheet()) {
        // 마우스 이벤트 실행 방지:
        e.preventDefault();

        // 드래그된 현재 위치Y - 처음 터치한 위치Y:
        const touchOffset = currentTouch.clientY - touchStart.touchY;
        // 이동 후의 바텀 시트의 최상단 높이:
        let nextSheetY = touchStart.sheetY + touchOffset;

        // 단, 바텀시트의 높이는 MIN_Y ~ MAX_Y 사이로 제한:
        if (nextSheetY <= MIN_Y) {
          nextSheetY = MIN_Y;
        }
        if (nextSheetY >= MAX_Y) {
          nextSheetY = MAX_Y;
        }

        sheet.current!.style.setProperty('transform', `translateY(${nextSheetY - MAX_Y}px)`); //바닥 만큼은 빼야쥬...
      } else {
        // content를 스크롤하는 동안에는 body가 스크롤되지 않도록:
        document.body.style.overflowY = 'hidden';
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      document.body.style.overflowY = 'auto';

      const { touchMove } = metrics.current;

      const currentSheetY = sheet.current!.getBoundingClientRect().y;

      if (currentSheetY !== MIN_Y) {
        // 아래로 스크롤하는 경우, 바텀시트가 원래 위치로 돌아가도록(=== 가장 작은 크기로 되돌아감):
        if (touchMove.movingDirection === 'down') {
          sheet.current!.style.setProperty('transform', 'translateY(0)');
        }

        // 위로 스크롤하는 경우, 바텀시트가 가장 큰 크기로 되돌아가도록(=== 가장 큰 크기로 펴짐):
        if (touchMove.movingDirection === 'up') {
          sheet.current!.style.setProperty('transform', `translateY(${MIN_Y - MAX_Y}px)`);
        }
      }

      // metrics 초기화:
      metrics.current = {
        // 터치 시작 지점:
        touchStart: {
          sheetY: 0,
          touchY: 0,
        },
        // 터치 이동 지점 및 방향:
        touchMove: {
          prevTouchY: 0,
          movingDirection: 'none',
        },
        // 터치가 content영역에서 시작했는지 여부:
        isContentAreaTouched: false,
      };
    };

    // 위 함수들을 이벤트리스너로 등록:
    sheet.current!.addEventListener('touchstart', handleTouchStart);
    sheet.current!.addEventListener('touchmove', handleTouchMove);
    sheet.current!.addEventListener('touchend', handleTouchEnd);

    // 컴포넌트가 언마운트될 때, 이벤트리스너 제거:
    return () => {
      sheet.current!.removeEventListener('touchstart', handleTouchStart);
      sheet.current!.removeEventListener('touchmove', handleTouchMove);
      sheet.current!.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    // content영역을 터치하고 있을 때 isContentAreaTouched를 true로 변경:
    const handleTouchStart = () => {
      metrics.current!.isContentAreaTouched = true;
    };

    content.current!.addEventListener('touchstart', handleTouchStart);
  }, []);

  return { sheet, content };
}
