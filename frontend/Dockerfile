FROM httpd:2.4

RUN true \
    #
    #
    #
    && sed -i "s/AllowOverride None/AllowOverride All/" /usr/local/apache2/conf/httpd.conf \
    && sed -i "s/#LoadModule expires_module/LoadModule expires_module/" /usr/local/apache2/conf/httpd.conf \
    && sed -i "s/#LoadModule headers_module/LoadModule headers_module/" /usr/local/apache2/conf/httpd.conf \
    && sed -i "s/#LoadModule rewrite_module/LoadModule rewrite_module/" /usr/local/apache2/conf/httpd.conf \
    && sed -i "s/#LoadModule proxy_module/LoadModule proxy_module/" /usr/local/apache2/conf/httpd.conf \
    && sed -i "s/#LoadModule proxy_http_module/LoadModule proxy_http_module/" /usr/local/apache2/conf/httpd.conf \
    && sed -i "s/#LoadModule ssl_module/LoadModule ssl_module/" /usr/local/apache2/conf/httpd.conf \
    #
    #
    #
    && echo "SSLProxyEngine on" >> /usr/local/apache2/conf/httpd.conf \
    #
    && true

COPY ./build /usr/local/apache2/htdocs/