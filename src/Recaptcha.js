/**
* MIT License
* 
* Copyright (c) 2020 Douglas Nassif Roma Junior
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE. 
*/

import React, {
    forwardRef,
    useMemo,
    useState,
    useCallback,
    useRef,
    useImperativeHandle,
    memo,
} from 'react';
import {
    Dimensions,
    StyleSheet,
    ActivityIndicator,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

import WebView from 'react-native-webview';
import getTemplate from './get-template';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const styles = StyleSheet.create({
    webView: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const originWhitelist = ['*'];

const Recaptcha = forwardRef(({
    headerComponent,
    footerComponent,
    loadingComponent,
    webViewProps,
    onVerify,
    onExpire,
    onError,
    onClose,
    theme,
    size,
    siteKey,
    hideBadge,
    hideLoader,
    baseUrl,
    lang,
    style,
    enterprise,
}, $ref,
) => {
    const $webView = useRef();
    const [loading, setLoading] = useState(true);

    const containerOpacity = useSharedValue(0);
    const containerZIndex = useSharedValue(-1000);

    const containerStyles = useAnimatedStyle(() => ({
        position: 'absolute',
        width,
        height,
        opacity: containerOpacity.value,
        zIndex: containerZIndex.value,
    }));

    const html = useMemo(() => {
        return getTemplate({
            hideBadge,
            siteKey,
            size,
            theme,
            lang,
        }, enterprise);
    }, [siteKey, size, theme, lang, enterprise]);

    const handleMessage = useCallback((content) => {
        try {
            const payload = JSON.parse(content.nativeEvent.data);
            if(payload.verify) {
                handleClose();
                onVerify && onVerify(payload.verify);
            }
            if(payload.expired) {
                handleClose();
                onExpire && onExpire();
            }
            if(payload.error) {
                handleClose();
                onError && onError(payload.error);
            }
        } catch (error) {
            console.warn(error);
        }
    }, []);

    const source = useMemo(() => ({
        html,
        baseUrl,
    }), [html, baseUrl]);

    const handleClose = () => {
        containerOpacity.value = 0;
        containerZIndex.value = -1000;
        $webView.current.injectJavaScript(`
            grecaptcha.reset();
            true;
        `);
        onClose && onClose();
    }

    const handleOpen = () => {
        containerOpacity.value = 1;
        containerZIndex.value = 1000;
        $webView.current.injectJavaScript(`
            grecaptcha.execute();
            true;
        `);
        setLoading(true);
    }

    useImperativeHandle($ref, () => ({
        open: handleOpen,
        close: handleClose,
    }), [handleClose, handleOpen]);

    const handleNavigationStateChange = useCallback(() => {
        // prevent navigation on Android
        if (!loading) {
            $webView.current.stopLoading();
        }
    }, [loading]);

    const handleShouldStartLoadWithRequest = useCallback(event => {
        // prevent navigation on iOS
        return event.navigationType === 'other';
    }, [loading]);

    const webViewStyles = useMemo(() => [
        styles.webView,
        style,
    ], [style]);

    const renderLoading = () => {
        if ((!loading && source) || hideLoader) {
            return null;
        }
        return (
            <View style={styles.loadingContainer}>
                {loadingComponent || <ActivityIndicator size="large" />}
            </View>
        );
    };

    return (
        <Animated.View style={containerStyles}>
            {headerComponent}
            <WebView bounces={false}
                allowsBackForwardNavigationGestures={false}
                {...webViewProps}
                source={source}
                onLoadEnd={() => setLoading(false)}
                style={webViewStyles}
                originWhitelist={originWhitelist}
                onMessage={handleMessage}
                onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
                onNavigationStateChange={handleNavigationStateChange}
                ref={$webView}
            />
            {footerComponent}
            {renderLoading()}
        </Animated.View>
    );
});

Recaptcha.defaultProps = {
    size: 'invisible',
    theme: 'light',
    enterprise: false,
};

export default memo(Recaptcha);