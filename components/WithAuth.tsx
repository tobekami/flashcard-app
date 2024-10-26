import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth, onAuthStateChanged } from '@/lib/firebase';

const withAuth = (WrappedComponent: React.ComponentType<any>) => {
  const WithAuth = (props: any) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setIsAuthenticated(true);
        } else {
          router.push('/login');
        }
      });

      return () => unsubscribe();
    }, [router]);

    if (!isAuthenticated) {
      return null; // or a loading spinner
    }

    return <WrappedComponent {...props} />;
  };

  WithAuth.displayName = `WithAuth(${getDisplayName(WrappedComponent)})`;
  return WithAuth;
};

function getDisplayName(WrappedComponent: React.ComponentType<any>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export default withAuth;